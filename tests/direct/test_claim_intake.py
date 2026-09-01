import pytest

from conftest import EVIDENCE_URLS, GEN, TX_HASHES, hexof


def test_file_claim_escrows_bond_and_freezes_policy(
    contract, direct_vm, direct_bob, policy
):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0

    c = contract.get_claim(claim_id)
    assert c["state"] == "FILED"
    assert c["filing_bond_atto"] == "5000"
    assert c["claimant"].lower() == hexof(direct_bob).lower()
    assert c["evidence_urls"] == EVIDENCE_URLS
    assert contract.get_policy(policy)["state"] == "CLAIMING"


def test_only_the_policyholder_may_claim(contract, direct_vm, direct_charlie, policy):
    direct_vm.sender = direct_charlie
    direct_vm.value = 5000
    with direct_vm.expect_revert("Only the policyholder"):
        contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0


def test_filing_bond_is_enforced(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 999
    with direct_vm.expect_revert("Filing bond is"):
        contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 0


def test_evidence_host_allowlist_is_enforced(contract, direct_vm, direct_bob, policy):
    """The shortest path from a crafted page to the pool's capital."""
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    with direct_vm.expect_revert("is not admissible"):
        contract.file_claim(policy, ["https://attacker.example/my-own-postmortem"], TX_HASHES)
    direct_vm.value = 0


def test_evidence_must_be_https(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    with direct_vm.expect_revert("must be https"):
        contract.file_claim(policy, ["http://rekt.news/report"], TX_HASHES)
    direct_vm.value = 0


def test_at_least_one_evidence_url_required(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    with direct_vm.expect_revert("at least one evidence url"):
        contract.file_claim(policy, [], TX_HASHES)
    direct_vm.value = 0


def test_malformed_tx_hash_rejected(contract, direct_vm, direct_bob, policy):
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    with direct_vm.expect_revert("not a transaction hash"):
        contract.file_claim(policy, EVIDENCE_URLS, ["0xdeadbeef"])
    direct_vm.value = 0


def test_claims_with_no_tx_hashes_are_allowed(contract, direct_vm, direct_bob, policy):
    """Some products are settled entirely on narrative evidence."""
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    claim_id = contract.file_claim(policy, EVIDENCE_URLS, [])
    direct_vm.value = 0
    assert contract.get_claim(claim_id)["chain_tx_hashes"] == []


def test_second_claim_cannot_race_the_first(contract, direct_vm, direct_bob, policy):
    """
    Filing freezes the policy, so a holder cannot run two claims at once
    against the same locked cover. Re-filing identical evidence after the
    policy comes back is blocked separately, by the evidence digest - see
    test_settlement.test_rejected_claim_evidence_cannot_be_refiled.
    """
    direct_vm.sender = direct_bob
    direct_vm.value = 5000
    contract.file_claim(policy, EVIDENCE_URLS, TX_HASHES)
    direct_vm.value = 5000
    with direct_vm.expect_revert("is CLAIMING"):
        contract.file_claim(policy, ["https://rekt.news/other-report"], TX_HASHES)
    direct_vm.value = 0
