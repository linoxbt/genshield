import pytest

from conftest import GEN, HOSTS, hexof, make_product, mock_review


def test_create_product_starts_pending(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    p = contract.get_product(pid)
    assert p["review_state"] == "PENDING"
    assert p["underwriter"].lower() == hexof(direct_alice).lower()
    assert p["evidence_hosts"] == HOSTS
    assert p["capital_atto"] == "0"


def test_hosts_are_normalized_and_deduped(contract, direct_vm, direct_alice):
    pid = make_product(
        contract, direct_vm, direct_alice,
        evidence_hosts=["https://Rekt.News/path", "rekt.news", "blog.example-protocol.io"],
    )
    assert contract.get_product(pid)["evidence_hosts"] == ["rekt.news", "blog.example-protocol.io"]


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"chain_rpc": "http://rpc.example-chain.io"}, "chain_rpc must be https"),
        ({"evidence_hosts": []}, "at least one evidence host"),
        ({"evidence_hosts": ["not a host"]}, "invalid evidence host"),
        ({"rate_bps_per_day": 0}, "rate_bps_per_day must be positive"),
        ({"max_coverage_atto": 1}, "invalid coverage bounds"),
        ({"max_leverage_bps": 9999}, "max_leverage_bps must be"),
        ({"max_leverage_bps": 60000}, "max_leverage_bps must be"),
        ({"util_slope_bps": 10001}, "util_slope_bps exceeds"),
        ({"wording": "   "}, "wording must be"),
    ],
)
def test_create_product_validation(contract, direct_vm, direct_alice, overrides, message):
    with direct_vm.expect_revert(message):
        make_product(contract, direct_vm, direct_alice, **overrides)


def test_review_approves_adjudicable_wording(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True, note="names a specific failure")
    direct_vm.sender = direct_alice
    assert contract.review_product(pid) == "APPROVED"
    assert contract.get_product(pid)["review_note"] == "names a specific failure"


def test_review_rejects_vague_wording(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice, wording="Covers any loss suffered.")
    mock_review(direct_vm, adjudicable=False, note="open ended")
    direct_vm.sender = direct_alice
    assert contract.review_product(pid) == "REJECTED"


def test_review_is_one_shot(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    direct_vm.sender = direct_alice
    contract.review_product(pid)
    with direct_vm.expect_revert("already been reviewed"):
        contract.review_product(pid)


def test_rejected_product_cannot_sell_cover(contract, direct_vm, direct_alice, direct_bob):
    pid = make_product(contract, direct_vm, direct_alice, wording="Covers any loss suffered.")
    mock_review(direct_vm, adjudicable=False)
    direct_vm.sender = direct_alice
    contract.review_product(pid)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not approved for underwriting"):
        contract.quote(pid, 10 * GEN, 30)


def test_unreviewed_product_cannot_sell_cover(contract, direct_vm, direct_alice, direct_bob):
    pid = make_product(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not approved for underwriting"):
        contract.quote(pid, 10 * GEN, 30)
