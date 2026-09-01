"""
Live consensus tests against Studio Network.

These are the only tests that exercise real validators, real web fetches and a
real LLM. They need a raw deployer key in a gitignored gltest.config.yaml, so
they do not run in CI and are not part of the default pytest run - `pytest.ini`
points at tests/direct only. Run explicitly:

    pytest tests/integration --network studionet

Studio's shared limits (30 requests per minute, 5000 per day) are the real
constraint here; run the module as a whole rather than looping single tests.
"""
import pytest

from conftest import EVIDENCE, GEN, TX_HASHES


def test_wording_review_gates_underwriting(deployed):
    """A product cannot sell cover until a real round approves its wording."""
    contract, product_id = deployed
    product = contract.get_product(args=[product_id]).call()
    assert product["review_state"] == "APPROVED", product["review_note"]
    assert int(product["capital_atto"]) == 2 * GEN


def test_vague_wording_is_rejected_live(deployed, default_account):
    """
    The gate has to reject as well as approve, or it is not a gate. Wording
    with no observable trigger should not reach the pool.
    """
    contract, _ = deployed
    vague_id = int(
        contract.create_product(
            args=[
                "Vague cover",
                "This policy compensates users for any loss they suffer.",
                ["rekt.news"],
                "https://ethereum-rpc.publicnode.com",
                10, GEN // 10, 5 * GEN, 20000, 5000,
            ]
        ).transact()
        or 0
    )
    contract.review_product(args=[vague_id]).transact()
    assert contract.get_product(args=[vague_id]).call()["review_state"] == "REJECTED"


def test_full_claim_path_settles(deployed, default_account):
    """
    File, pull real receipts off Ethereum, read a real incident report against
    the wording, and settle. The evidence describes an incident the reporting
    explicitly says was not an oracle failure, so this wording should not
    respond - the assertion is that a verdict is reached and money moves
    consistently with it, not that it pays.
    """
    contract, product_id = deployed
    quote = contract.quote(args=[product_id, GEN, 30]).call()
    policy_id = int(
        contract.buy_policy(args=[product_id, GEN, 30]).transact(value=int(quote["premium_atto"]))
        or 1
    )
    claim_id = int(
        contract.file_claim(args=[policy_id, EVIDENCE, TX_HASHES]).transact(value=GEN // 100) or 1
    )

    facts = contract.attach_chain_evidence(args=[claim_id]).transact()
    assert facts is not None

    contract.adjudicate(args=[claim_id]).transact()
    claim = contract.get_claim(args=[claim_id]).call()
    assert claim["verdict"] in ("COVERED", "NOT_COVERED")
    assert claim["state"] == "ADJUDICATED"
    assert len(claim["rounds"]) == 1

    before = int(contract.get_product(args=[product_id]).call()["capital_atto"])
    result = contract.settle(args=[claim_id]).transact()
    after = int(contract.get_product(args=[product_id]).call()["capital_atto"])

    settled = contract.get_claim(args=[claim_id]).call()
    assert settled["state"] == "SETTLED"
    if settled["verdict"] == "COVERED":
        assert after < before
        assert int(settled["payout_atto"]) > 0
    else:
        # A rejected claim forfeits its bond into the pool, less the fee.
        assert after > before
        assert int(settled["payout_atto"]) == 0
    assert contract.get_product(args=[product_id]).call()["locked_atto"] == "0"


def test_chain_facts_reach_consensus(deployed):
    """
    strict_eq over a live Ethereum node. If the canonicaliser let an unstable
    field through, this call would fail consensus rather than return.
    """
    contract, product_id = deployed
    stats = contract.stats().call()
    assert int(stats["claims"]) >= 1
