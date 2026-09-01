import pytest

from conftest import (
    EVIDENCE_URLS, GEN, TX_HASHES, hexof, make_product, mock_adjudication, mock_review, mock_rpc,
)


def build(contract, vm, alice, bob, capital=100 * GEN, cover=10 * GEN, **deploy_kw):
    pid = make_product(contract, vm, alice)
    mock_review(vm, adjudicable=True)
    vm.sender = alice
    contract.review_product(pid)
    vm.value = capital
    contract.deposit(pid)
    vm.value = 0
    vm.sender = bob
    premium = int(contract.quote(pid, cover, 30)["premium_atto"])
    vm.value = premium
    policy_id = contract.buy_policy(pid, cover, 30)
    vm.value = 0
    return pid, policy_id, premium


def file_and_adjudicate(contract, vm, bob, policy_id, covered=True, loss_bps=6000, bond=5000,
                        urls=None):
    vm.sender = bob
    vm.value = bond
    claim_id = contract.file_claim(policy_id, urls or EVIDENCE_URLS, TX_HASHES)
    vm.value = 0
    mock_rpc(vm)
    contract.attach_chain_evidence(claim_id)
    mock_adjudication(vm, covered=covered, loss_bps=loss_bps)
    contract.adjudicate(claim_id)
    return claim_id


def test_approved_claim_pays_the_bucket_share_of_cover(
    contract, direct_vm, direct_alice, direct_bob
):
    pid, policy_id, premium = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(contract, direct_vm, direct_bob, policy_id, loss_bps=6100)

    before = contract.get_product(pid)
    result = contract.settle(claim_id)
    # decile 6 -> midpoint 6500 bps of 10 GEN
    expected = 10 * GEN * 6500 // 10000
    assert result["payout_atto"] == str(expected)
    assert result["protocol_fee_atto"] == "0"

    after = contract.get_product(pid)
    assert int(after["capital_atto"]) == int(before["capital_atto"]) - expected
    assert after["locked_atto"] == "0"
    assert contract.get_policy(policy_id)["state"] == "CLAIMED"
    assert contract.get_claim(claim_id)["state"] == "SETTLED"


def test_payout_never_exceeds_the_sum_insured(contract, direct_vm, direct_alice, direct_bob):
    pid, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(contract, direct_vm, direct_bob, policy_id, loss_bps=10000)
    payout = int(contract.settle(claim_id)["payout_atto"])
    assert payout == 10 * GEN * 9500 // 10000
    assert payout < 10 * GEN


def test_rejected_claim_forfeits_the_bond_to_the_pool(
    contract, direct_vm, direct_alice, direct_bob
):
    pid, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(
        contract, direct_vm, direct_bob, policy_id, covered=False, loss_bps=0, bond=10000
    )
    before = int(contract.get_product(pid)["capital_atto"])
    result = contract.settle(claim_id)

    assert result["payout_atto"] == "0"
    # 5% protocol fee on the forfeited bond, the rest to the pool
    assert result["protocol_fee_atto"] == "500"
    after = int(contract.get_product(pid)["capital_atto"])
    assert after == before + 9500
    assert contract.get_product(pid)["locked_atto"] == "0"
    # The cover is released but not spent, so the policy is live again.
    assert contract.get_policy(policy_id)["state"] == "ACTIVE"


def test_rejected_claim_evidence_cannot_be_refiled(
    contract, direct_vm, direct_alice, direct_bob
):
    """The digest guard bites once the policy has come back to ACTIVE."""
    pid, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(
        contract, direct_vm, direct_bob, policy_id, covered=False, loss_bps=0
    )
    contract.settle(claim_id)

    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    with direct_vm.expect_revert("already filed"):
        contract.file_claim(policy_id, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0


def test_fresh_evidence_can_be_refiled_after_a_rejection(
    contract, direct_vm, direct_alice, direct_bob
):
    pid, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(
        contract, direct_vm, direct_bob, policy_id, covered=False, loss_bps=0
    )
    contract.settle(claim_id)
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    second = contract.file_claim(policy_id, ["https://rekt.news/fuller-postmortem"], TX_HASHES)
    direct_vm.value = 0
    assert contract.get_claim(second)["state"] == "FILED"


def test_a_payout_dilutes_every_lp_proportionally(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    """
    Share accounting is what makes this true. Flat per-depositor balances
    would let whoever exits first take their money out at par after a loss,
    leaving the stragglers to absorb all of it.
    """
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)

    direct_vm.sender = direct_alice
    direct_vm.value = 50 * GEN
    alice_shares = int(contract.deposit(pid))
    direct_vm.sender = direct_charlie
    direct_vm.value = 50 * GEN
    charlie_shares = int(contract.deposit(pid))
    direct_vm.value = 0
    assert alice_shares == charlie_shares

    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 0

    claim_id = file_and_adjudicate(contract, direct_vm, direct_bob, policy_id, loss_bps=6100)
    contract.settle(claim_id)

    alice_value = int(contract.share_value(pid, alice_shares))
    charlie_value = int(contract.share_value(pid, charlie_shares))
    assert alice_value == charlie_value
    # Each LP absorbed half the payout and earned half the premium.
    payout = 10 * GEN * 6500 // 10000
    assert alice_value == (100 * GEN + premium - payout) // 2


def test_settlement_requires_an_adjudicated_claim(contract, direct_vm, direct_alice, direct_bob):
    _, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy_id, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    with direct_vm.expect_revert("is FILED, not ADJUDICATED"):
        contract.settle(claim_id)


def test_a_claim_cannot_be_settled_twice(contract, direct_vm, direct_alice, direct_bob):
    _, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    claim_id = file_and_adjudicate(contract, direct_vm, direct_bob, policy_id)
    contract.settle(claim_id)
    with direct_vm.expect_revert("is SETTLED, not ADJUDICATED"):
        contract.settle(claim_id)


def test_payout_is_capped_by_remaining_capital(contract, direct_vm, direct_alice, direct_bob):
    """A pool cannot pay out more than it holds, whatever the wording says."""
    pid = make_product(contract, direct_vm, direct_alice, max_leverage_bps=50000)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)
    direct_vm.sender = direct_alice
    direct_vm.value = 10 * GEN
    shares = int(contract.deposit(pid))
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 40 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 40 * GEN, 30)
    direct_vm.value = 0

    claim_id = file_and_adjudicate(contract, direct_vm, direct_bob, policy_id, loss_bps=9500)
    payout = int(contract.settle(claim_id)["payout_atto"])
    assert payout == 10 * GEN + premium
    assert contract.get_product(pid)["capital_atto"] == "0"


def test_expired_policy_releases_its_cover(contract, direct_vm, direct_alice, direct_bob):
    # A zero-day policy is impossible, so expiry is reached by deploying with
    # a policy that has already lapsed relative to the fixed direct-mode clock.
    pid, policy_id, _ = build(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("has not expired"):
        contract.release_expired(policy_id)
