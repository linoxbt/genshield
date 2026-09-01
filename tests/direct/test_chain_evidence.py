import json

import pytest

from conftest import EVIDENCE_URLS, GEN, NO_RECEIPT, TX_HASHES, mock_rpc, mock_rpc_raw


@pytest.fixture
def filed(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0
    return claim_id


def test_receipts_are_canonicalised_to_stable_fields(contract, direct_vm, filed):
    """
    Only fields two honest nodes must agree on survive. Anything that can
    drift between nodes answering the same query would turn every claim into
    a consensus failure, so it never reaches the snapshot.
    """
    mock_rpc(direct_vm)
    facts = json.loads(contract.attach_chain_evidence(filed))
    receipt = facts["receipts"][0]
    assert receipt["tx"] == TX_HASHES[0]
    assert receipt["found"] is True
    assert receipt["status"] == "0x1"
    assert receipt["block_number"] == "0x10"
    assert receipt["block_timestamp"] == "0x64000000"
    assert set(receipt) == {
        "tx", "found", "status", "block_number", "from", "to", "log_count", "block_timestamp",
    }


def test_snapshot_is_frozen_onto_the_claim(contract, direct_vm, filed):
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(filed)
    c = contract.get_claim(filed)
    assert c["state"] == "EVIDENCED"
    assert json.loads(c["chain_facts_json"])["receipts"][0]["found"] is True


def test_snapshot_is_json_canonical(contract, direct_vm, filed):
    """strict_eq compares the serialised string, so key order has to be fixed."""
    mock_rpc(direct_vm)
    facts = contract.attach_chain_evidence(filed)
    assert facts == json.dumps(json.loads(facts), sort_keys=True)


def test_claim_without_tx_hashes_skips_the_rpc(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, [])
    direct_vm.value = 0
    facts = contract.attach_chain_evidence(claim_id)
    assert json.loads(facts) == {"receipts": []}


def test_evidence_can_only_be_attached_once(contract, direct_vm, filed):
    mock_rpc(direct_vm)
    contract.attach_chain_evidence(filed)
    with direct_vm.expect_revert("is EVIDENCED, not FILED"):
        contract.attach_chain_evidence(filed)


def test_rpc_server_error_is_transient(contract, direct_vm, filed):
    mock_rpc_raw(direct_vm, {"status": 503, "body": "down"})
    with direct_vm.expect_revert("[TRANSIENT]"):
        contract.attach_chain_evidence(filed)


def test_rpc_client_error_is_external(contract, direct_vm, filed):
    mock_rpc_raw(direct_vm, {"status": 404, "body": "nope"})
    with direct_vm.expect_revert("[EXTERNAL]"):
        contract.attach_chain_evidence(filed)


def test_rpc_error_payload_is_external(contract, direct_vm, filed):
    mock_rpc_raw(direct_vm, {"status": 200, "body": json.dumps(
        {"jsonrpc": "2.0", "id": 1, "error": {"code": -32000, "message": "bad"}})})
    with direct_vm.expect_revert("[EXTERNAL]"):
        contract.attach_chain_evidence(filed)


def test_unknown_transaction_is_recorded_as_not_found(contract, direct_vm, filed):
    """A pending or unknown hash is a fact about the claim, not a round failure."""
    mock_rpc(direct_vm, result=NO_RECEIPT)
    facts = json.loads(contract.attach_chain_evidence(filed))
    assert facts["receipts"][0] == {"tx": TX_HASHES[0], "found": False}
