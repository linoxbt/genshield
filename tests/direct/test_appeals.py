import pytest

from conftest import (
    EVIDENCE_URLS, GEN, TX_HASHES, hexof, make_product, mock_adjudication, mock_review, mock_rpc,
)

WINDOW = 3600


@pytest.fixture
def contract(deploy):
    """A live appeal window - the fixed direct-mode clock never leaves it."""
    return deploy(appeal_window_seconds=WINDOW, min_appeal_bond_atto=1000, appeal_bond_bps=1000)


@pytest.fixture
def adjudicated(contract, direct_vm, direct_alice, direct_bob):
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)
    direct_vm.sender = direct_alice
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy_id, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(claim_id)
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    contract.adjudicate(claim_id)
    return pid, policy_id, claim_id


def test_settlement_waits_out_the_appeal_window(contract, direct_vm, adjudicated):
    _, _, claim_id = adjudicated
    with direct_vm.expect_revert("Appeal window"):
        contract.settle(claim_id)


def test_appeal_reopens_the_claim_for_a_fresh_round(
    contract, direct_vm, direct_charlie, adjudicated
):
    _, _, claim_id = adjudicated
    direct_vm.sender = direct_charlie
    direct_vm.value = 1000
    assert contract.appeal(claim_id) is True
    direct_vm.value = 0
    c = contract.get_claim(claim_id)
    assert c["state"] == "APPEALED"
    assert c["appellant"].lower() == hexof(direct_charlie).lower()


def test_anyone_may_appeal_not_just_the_claimant(
    contract, direct_vm, direct_alice, adjudicated
):
    """An LP disputing a payout has the same standing as a rejected claimant."""
    _, _, claim_id = adjudicated
    direct_vm.sender = direct_alice
    direct_vm.value = 1000
    assert contract.appeal(claim_id) is True
    direct_vm.value = 0


def test_appeal_bond_is_enforced(contract, direct_vm, direct_bob, adjudicated):
    _, _, claim_id = adjudicated
    direct_vm.sender = direct_bob
    direct_vm.value = 999
    with direct_vm.expect_revert("Appeal bond is"):
        contract.appeal(claim_id)
    direct_vm.value = 0


def test_appeal_bond_scales_with_what_is_at_stake(
    contract, direct_vm, direct_alice, direct_bob
):
    """Appealing a large payout is deliberately not cheap."""
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)
    direct_vm.sender = direct_alice
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 100 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 100 * GEN, 30)
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy_id, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(claim_id)
    mock_adjudication(direct_vm, covered=True, loss_bps=9500)
    contract.adjudicate(claim_id)

    # 95% of 100 GEN at stake, 10% appeal bond
    at_stake = 100 * GEN * 9500 // 10000
    direct_vm.value = at_stake * 1000 // 10000 - 1
    with direct_vm.expect_revert("Appeal bond is"):
        contract.appeal(claim_id)
    direct_vm.value = at_stake * 1000 // 10000
    assert contract.appeal(claim_id) is True
    direct_vm.value = 0


def test_only_one_appeal_per_claim(contract, direct_vm, direct_charlie, adjudicated):
    _, _, claim_id = adjudicated
    direct_vm.sender = direct_charlie
    direct_vm.value = 1000
    contract.appeal(claim_id)
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    contract.adjudicate(claim_id)
    direct_vm.value = 1000
    with direct_vm.expect_revert("already been appealed"):
        contract.appeal(claim_id)
    direct_vm.value = 0


def test_a_successful_appeal_returns_the_bond(
    contract, direct_vm, direct_charlie, adjudicated
):
    pid, _, claim_id = adjudicated
    direct_vm.sender = direct_charlie
    direct_vm.value = 1000
    contract.appeal(claim_id)
    direct_vm.value = 0
    # The rerun reaches a different answer, so the appellant was right.
    mock_adjudication(direct_vm, covered=True, loss_bps=6100)
    contract.adjudicate(claim_id)

    before = int(contract.get_product(pid)["capital_atto"])
    result = contract.settle(claim_id)
    assert result["verdict"] == "COVERED"
    # The appeal bond went back to the appellant, not into the pool.
    payout = 10 * GEN * 6500 // 10000
    assert int(contract.get_product(pid)["capital_atto"]) == before - payout
    assert result["protocol_fee_atto"] == "0"


def test_a_failed_appeal_forfeits_the_bond(contract, direct_vm, direct_charlie, adjudicated):
    pid, _, claim_id = adjudicated
    direct_vm.sender = direct_charlie
    direct_vm.value = 2000
    contract.appeal(claim_id)
    direct_vm.value = 0
    # The rerun lands in the same place, so the first round held up.
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    contract.adjudicate(claim_id)

    before = int(contract.get_product(pid)["capital_atto"])
    result = contract.settle(claim_id)
    assert result["verdict"] == "NOT_COVERED"
    # 5% fee on both the forfeited filing bond and the forfeited appeal bond.
    assert result["protocol_fee_atto"] == str(5000 * 5 // 100 + 2000 * 5 // 100)
    assert int(contract.get_product(pid)["capital_atto"]) == before + 4750 + 1900


def test_an_appeal_that_only_shifts_severity_bucket_succeeds(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    """A payout that lands in the wrong decile is a real error, not a quibble."""
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)
    direct_vm.sender = direct_alice
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy_id, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(claim_id)
    mock_adjudication(direct_vm, covered=True, loss_bps=2000)
    contract.adjudicate(claim_id)

    direct_vm.sender = direct_charlie
    direct_vm.value = 10 * GEN * 2500 // 10000 * 1000 // 10000
    contract.appeal(claim_id)
    direct_vm.value = 0
    mock_adjudication(direct_vm, covered=True, loss_bps=8000)
    contract.adjudicate(claim_id)

    result = contract.settle(claim_id)
    assert result["payout_atto"] == str(10 * GEN * 8500 // 10000)
    assert result["protocol_fee_atto"] == "0"


def test_appeal_requires_an_adjudicated_claim(contract, direct_vm, direct_bob, adjudicated):
    _, _, claim_id = adjudicated
    direct_vm.sender = direct_bob
    direct_vm.value = 1000
    contract.appeal(claim_id)
    direct_vm.value = 1000
    with direct_vm.expect_revert("is APPEALED, not ADJUDICATED"):
        contract.appeal(claim_id)
    direct_vm.value = 0
