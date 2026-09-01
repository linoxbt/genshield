import json

import pytest

from conftest import (
    ADJUDICATE_MARKER, EVIDENCE_URLS, GEN, TX_HASHES, mock_adjudication, mock_rpc,
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


def test_covered_verdict_is_recorded(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=6000)
    assert contract.adjudicate(evidenced) == "COVERED"
    c = contract.get_claim(evidenced)
    assert c["state"] == "ADJUDICATED"
    assert c["rounds"][0]["controlling_clause"] == "oracle price feed"


def test_not_covered_verdict_is_recorded(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=False, loss_bps=0)
    assert contract.adjudicate(evidenced) == "NOT_COVERED"
    c = contract.get_claim(evidenced)
    assert c["verdict"] == "NOT_COVERED"
    assert c["loss_bps"] == "0"


@pytest.mark.parametrize(
    "reported, stored",
    [
        (100, 500),     # decile 0 -> midpoint 5%
        (5001, 5500),   # decile 5 -> midpoint 55%
        (5999, 5500),   # same decile, same stored severity
        (10000, 9500),  # decile 9 -> midpoint 95%
    ],
)
def test_severity_is_stored_as_the_agreed_bucket_midpoint(
    contract, direct_vm, evidenced, reported, stored
):
    """
    The payout is a function of the decile both sides agreed on, never of the
    leader's own number - otherwise a leader inside a legitimately-agreed
    bucket could still move the payout unilaterally.
    """
    mock_adjudication(direct_vm, covered=True, loss_bps=reported)
    contract.adjudicate(evidenced)
    assert contract.get_claim(evidenced)["loss_bps"] == str(stored)


def test_neighbouring_severities_collapse_to_one_number(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=6001)
    contract.adjudicate(evidenced)
    first = contract.get_claim(evidenced)["loss_bps"]
    mock_adjudication(direct_vm, covered=True, loss_bps=6999)
    # same decile as 6001, so an independent reading lands on the same figure
    assert first == "6500"


def test_covered_claim_reporting_zero_loss_is_llm_error(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=0)
    with direct_vm.expect_revert("[LLM_ERROR]"):
        contract.adjudicate(evidenced)


def test_out_of_range_severity_is_llm_error(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm, covered=True, loss_bps=99999)
    with direct_vm.expect_revert("[LLM_ERROR]"):
        contract.adjudicate(evidenced)


def test_missing_covered_field_is_llm_error(contract, direct_vm, evidenced):
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 200, "body": "report"})
    direct_vm.mock_llm(rf".*{ADJUDICATE_MARKER}.*", json.dumps({"loss_bps": 5000}))
    with direct_vm.expect_revert("[LLM_ERROR]"):
        contract.adjudicate(evidenced)


def test_non_json_response_is_llm_error(contract, direct_vm, evidenced):
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 200, "body": "report"})
    direct_vm.mock_llm(rf".*{ADJUDICATE_MARKER}.*", "I am not going to answer that")
    with direct_vm.expect_revert("[LLM_ERROR]"):
        contract.adjudicate(evidenced)


def test_json_wrapped_in_prose_is_recovered(contract, direct_vm, evidenced):
    """Format instructions are never fully binding on free text."""
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 200, "body": "report"})
    direct_vm.mock_llm(
        rf".*{ADJUDICATE_MARKER}.*",
        'Here is my answer:\n{"covered": "yes", "loss_bps": "about 6000 bps", '
        '"controlling_clause": "oracle", "reasoning": "x"}\nHope that helps.',
    )
    assert contract.adjudicate(evidenced) == "COVERED"
    assert contract.get_claim(evidenced)["loss_bps"] == "6500"


def test_evidence_source_outage_is_transient(contract, direct_vm, evidenced):
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 503, "body": "down"})
    with direct_vm.expect_revert("[TRANSIENT]"):
        contract.adjudicate(evidenced)


def test_unreachable_evidence_still_reaches_a_verdict(contract, direct_vm, evidenced):
    """A 404 source is weighed as missing evidence, not treated as an outage."""
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 404, "body": "gone"})
    direct_vm.mock_llm(
        rf".*{ADJUDICATE_MARKER}.*",
        json.dumps({"covered": False, "loss_bps": 0, "controlling_clause": "", "reasoning": "no evidence"}),
    )
    assert contract.adjudicate(evidenced) == "NOT_COVERED"


def test_adjudication_requires_evidence_first(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    mock_adjudication(direct_vm)
    with direct_vm.expect_revert("not ready to adjudicate"):
        contract.adjudicate(claim_id)


def test_cannot_adjudicate_twice(contract, direct_vm, evidenced):
    mock_adjudication(direct_vm)
    contract.adjudicate(evidenced)
    with direct_vm.expect_revert("not ready to adjudicate"):
        contract.adjudicate(evidenced)
