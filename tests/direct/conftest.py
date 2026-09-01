import json

import pytest

GEN = 10**18


def hexof(account) -> str:
    """Direct-mode account fixtures are raw 20-byte values."""
    return "0x" + account.hex() if isinstance(account, (bytes, bytearray)) else str(account)

WORDING = (
    "This policy covers the insured against loss of principal caused by a "
    "failure of the AI trading agent deployed at the covered address, where "
    "that failure is either an oracle price feed reporting a price that "
    "deviates by more than 20 percent from the true market price, or the "
    "agent's executor contract reverting on a scheduled rebalance. Losses "
    "caused by ordinary adverse market movement are not covered."
)
HOSTS = ["rekt.news", "blog.example-protocol.io"]
RPC = "https://rpc.example-chain.io"
EVIDENCE_URLS = ["https://rekt.news/incident-report"]
TX_HASHES = ["0x" + "ab" * 32]

REVIEW_MARKER = "insurance underwriting reviewer"
ADJUDICATE_MARKER = "settling an insurance claim"


def mock_review(vm, adjudicable=True, note="specific and evidenced"):
    """
    gltest's mock list is first-match-wins and is never overwritten in place,
    so switching an answer between calls means clearing first. This always
    leaves exactly one review mock registered.
    """
    vm.clear_mocks()
    vm.mock_llm(
        rf".*{REVIEW_MARKER}.*",
        json.dumps({"adjudicable": adjudicable, "note": note}),
    )


def mock_adjudication(vm, covered=True, loss_bps=6000, clause="oracle price feed", reasoning="a b"):
    vm.clear_mocks()
    vm.mock_web(r".*", {"status": 200, "body": "Postmortem: the oracle reported a stale price."})
    vm.mock_llm(
        rf".*{ADJUDICATE_MARKER}.*",
        json.dumps(
            {
                "covered": covered,
                "loss_bps": loss_bps,
                "controlling_clause": clause,
                "reasoning": reasoning,
            }
        ),
    )


NO_RECEIPT = object()


def mock_rpc(vm, status="0x1", block="0x10", timestamp="0x64000000", result=None):
    """The contract reaches the chain over JSON-RPC, so this mock must be a POST."""
    if result is NO_RECEIPT:
        result = None
    elif result is None:
        result = {
            "status": status,
            "blockNumber": block,
            "from": "0x1111111111111111111111111111111111111111",
            "to": "0x2222222222222222222222222222222222222222",
            "logs": [],
            "timestamp": timestamp,
        }
    mock_rpc_raw(vm, {"status": 200, "body": json.dumps({"jsonrpc": "2.0", "id": 1, "result": result}).encode()})


def mock_rpc_raw(vm, response):
    body = response.get("body", b"")
    vm.mock_web(
        r".*rpc\.example-chain\.io.*",
        {
            "response": {
                "status": response.get("status", 200),
                "headers": {},
                "body": body if isinstance(body, (bytes, bytearray)) else str(body).encode(),
            },
            "method": "POST",
        },
    )


@pytest.fixture
def deploy(direct_deploy, direct_owner):
    """
    Test-friendly economics. appeal_window_seconds defaults to 0 so the
    settlement path is reachable without waiting - direct mode's clock is
    fixed for the life of a deployed instance, so anything needing elapsed
    time between two calls uses this deploy-time knob rather than a warp.
    Appeal tests override it to a large window instead.
    """

    def _deploy(**overrides):
        kwargs = dict(
            treasury=overrides.pop("treasury", direct_owner),
            protocol_fee_bps=overrides.pop("protocol_fee_bps", 500),
            min_filing_bond_atto=overrides.pop("min_filing_bond_atto", 1000),
            min_appeal_bond_atto=overrides.pop("min_appeal_bond_atto", 1000),
            appeal_window_seconds=overrides.pop("appeal_window_seconds", 0),
            appeal_bond_bps=overrides.pop("appeal_bond_bps", 1000),
        )
        assert not overrides, f"unknown deploy overrides: {overrides}"
        return direct_deploy("contracts/genshield.py", **kwargs)

    return _deploy


@pytest.fixture
def contract(deploy):
    return deploy()


def make_product(contract, vm, sender, **overrides):
    vm.sender = sender
    return contract.create_product(
        overrides.pop("name", "AI Trader X cover"),
        overrides.pop("wording", WORDING),
        overrides.pop("evidence_hosts", HOSTS),
        overrides.pop("chain_rpc", RPC),
        overrides.pop("rate_bps_per_day", 10),
        overrides.pop("min_coverage_atto", 1 * GEN),
        overrides.pop("max_coverage_atto", 100 * GEN),
        overrides.pop("max_leverage_bps", 20000),
        overrides.pop("util_slope_bps", 5000),
    )


@pytest.fixture
def product(contract, direct_vm, direct_alice):
    """An approved product with a funded pool, ready to underwrite."""
    pid = make_product(contract, direct_vm, direct_alice)
    mock_review(direct_vm, adjudicable=True)
    direct_vm.sender = direct_alice
    contract.review_product(pid)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    return pid


@pytest.fixture
def policy(contract, direct_vm, direct_bob, product):
    direct_vm.sender = direct_bob
    quoted = int(contract.quote(product, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = quoted
    pid = contract.buy_policy(product, 10 * GEN, 30)
    direct_vm.value = 0
    return pid
