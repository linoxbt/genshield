"""
The validator half of each round, replayed directly.

`run_validator` re-invokes the captured validator closure, and the validator
reruns the whole job internally - so swapping the mocks between the contract
call and the replay simulates a validator that independently saw something
different from the leader. This is the only place the consensus rule is
actually exercised; everything else only tests the leader's path.
"""
import json

import pytest

from conftest import (
    ADJUDICATE_MARKER, EVIDENCE_URLS, GEN, REVIEW_MARKER, TX_HASHES,
    make_product, mock_adjudication, mock_review, mock_rpc,
)


@pytest.fixture
def evidenced(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(claim_id)
    return claim_id


def test_validator_agrees_with_an_identical_reading(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=6000)
    contract.adjudicate(evidenced)
    assert direct_vm.run_validator() is True


def test_validator_agrees_within_the_same_decile(contract, direct_vm, evidenced):
    """
    The point of the bucketing. Two honest independent readings of the same
    incident will differ on the raw percentage; comparing raw severity would
    fail consensus on nearly every genuine claim.
    """
    mock_adjudication(direct_vm, covered=True, loss_bps=6100)
    contract.adjudicate(evidenced)
    mock_adjudication(direct_vm, covered=True, loss_bps=6900)
    assert direct_vm.run_validator() is True


def test_validator_disagrees_across_deciles(contract, direct_vm, evidenced):
    """And the bucketing is not so coarse that it stops catching real gaps."""
    mock_adjudication(direct_vm, covered=True, loss_bps=2000)
    contract.adjudicate(evidenced)
    mock_adjudication(direct_vm, covered=True, loss_bps=9000)
    assert direct_vm.run_validator() is False


def test_validator_disagrees_on_the_verdict(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=6000)
    contract.adjudicate(evidenced)
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    assert direct_vm.run_validator() is False


def test_validator_ignores_severity_when_both_reject(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    contract.adjudicate(evidenced)
    mock_adjudication(direct_vm, covered=False, loss_bps=0, reasoning="different wording entirely")
    assert direct_vm.run_validator() is True


def test_validator_rejects_a_leader_result_it_did_not_derive(contract, direct_vm, evidenced):
    """
    A leader claiming a total loss while every independent reading says
    otherwise is exactly the attack the round exists to stop.
    """
    mock_adjudication(direct_vm, covered=True, loss_bps=1000)
    contract.adjudicate(evidenced)
    forged = {"covered": True, "loss_bps": 9500, "controlling_clause": "x", "reasoning": "y"}
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_rejects_a_leader_that_invented_coverage(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    contract.adjudicate(evidenced)
    forged = {"covered": True, "loss_bps": 9500, "controlling_clause": "x", "reasoning": "y"}
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_agrees_when_both_sides_hit_the_same_outage(contract, direct_vm, evidenced):
    """
    Transient failures only need both sides to have failed transiently -
    otherwise a single flaky evidence host would force endless rotation.
    """
    mock_adjudication(direct_vm, covered=True, loss_bps=6000)
    contract.adjudicate(evidenced)
    # The validator now finds the same source down that the leader did.
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 503, "body": "down"})
    agreed = direct_vm.run_validator(
        leader_error=Exception("[TRANSIENT] evidence source https://rekt.news/incident-report is unavailable (503)")
    )
    assert agreed is True


def test_validator_disagrees_when_only_the_leader_failed(contract, direct_vm, evidenced):
    """A leader that errored while the validator succeeded must force rotation."""
    mock_adjudication(direct_vm, covered=True, loss_bps=6000)
    contract.adjudicate(evidenced)
    assert direct_vm.run_validator(leader_error=Exception("[LLM_ERROR] garbage")) is False


def test_review_validator_agrees_on_the_same_boolean(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True, note="one phrasing")
    contract.review_product(pid)
    mock_review(direct_vm, adjudicable=True, note="an entirely different phrasing")
    assert direct_vm.run_validator() is True


def test_review_validator_disagrees_on_the_boolean(contract, direct_vm, direct_alice):
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    contract.review_product(pid)
    mock_review(direct_vm, adjudicable=False)
    assert direct_vm.run_validator() is False
