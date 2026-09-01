import pytest

from conftest import EVIDENCE_URLS, GEN, TX_HASHES, hexof, make_product, mock_review


def test_missing_entities_report_clearly(contract, direct_vm):
    for method, name in (("get_product", "Product"), ("get_policy", "Policy"), ("get_claim", "Claim")):
        with direct_vm.expect_revert(f"{name} 99 does not exist"):
            getattr(contract, method)(99)


def test_stats_aggregate_across_products(contract, direct_vm, direct_alice, direct_bob):
    for _ in range(2):
        pid = make_product(contract, direct_vm, direct_alice)
        mock_review(direct_vm, adjudicable=True)
        contract.review_product(pid)
        direct_vm.sender = direct_alice
        direct_vm.value = 30 * GEN
        contract.deposit(pid)
        direct_vm.value = 0

    s = contract.stats()
    assert s["products"] == "2"
    assert s["capital_atto"] == str(60 * GEN)
    assert s["policies"] == "0"
    assert s["claims"] == "0"


def test_list_products_paginates(contract, direct_vm, direct_alice):
    for i in range(3):
        make_product(contract, direct_vm, direct_alice, name=f"cover {i}")
    assert contract.total_products() == "3"
    page = contract.list_products(1, 1)
    assert len(page) == 1
    assert page[0]["name"] == "cover 1"
    assert contract.list_products(0, 500) == contract.list_products(0, 3)


def test_shares_of_is_zero_for_a_stranger(contract, direct_vm, direct_alice, direct_charlie):
    pid = make_product(contract, direct_vm, direct_alice)
    assert contract.shares_of(pid, direct_charlie) == "0"


def test_share_value_of_an_empty_pool_is_zero(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    assert contract.share_value(pid, 1000) == "0"


@pytest.mark.parametrize(
    "kwargs, message",
    [
        ({"protocol_fee_bps": 10001}, "protocol_fee_bps exceeds"),
        ({"appeal_bond_bps": 10001}, "appeal_bond_bps exceeds"),
        ({"min_filing_bond_atto": 0}, "min_filing_bond_atto must be positive"),
        ({"min_appeal_bond_atto": 0}, "min_appeal_bond_atto must be positive"),
    ],
)
def test_deploy_time_validation(deploy, direct_vm, kwargs, message):
    with direct_vm.expect_revert(message):
        deploy(**kwargs)


def test_claim_view_exposes_every_round(contract, direct_vm, direct_bob, policy):
    from conftest import mock_adjudication, mock_rpc

    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(claim_id)
    mock_adjudication(direct_vm, covered=True, loss_bps=6000, reasoning="the oracle went stale")
    contract.adjudicate(claim_id)

    rounds = contract.get_claim(claim_id)["rounds"]
    assert len(rounds) == 1
    assert rounds[0]["verdict"] == "COVERED"
    assert rounds[0]["appeal_round"] == 0
    assert rounds[0]["reasoning"] == "the oracle went stale"
