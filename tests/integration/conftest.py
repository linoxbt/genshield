import pytest

from gltest import get_contract_factory
from gltest.fixtures import gl_client, default_account, accounts  # noqa: F401

GEN = 10**18

WORDING = (
    "This policy covers loss of principal on the covered lending protocol where "
    "published incident reporting states that the loss was caused by the protocol "
    "price oracle publishing a price for a collateral asset that was more than 20 "
    "percent away from the price at which that asset was actually trading on the "
    "open market at the same time. Loss is NOT covered where the reporting states "
    "that the asset price used by the protocol was the real market price at the "
    "time, including where that market price had itself been moved by open-market "
    "buying or selling."
)
HOSTS = ["rekt.news"]
RPC = "https://ethereum-rpc.publicnode.com"
EVIDENCE = ["https://rekt.news/mango-markets-rekt"]
TX_HASHES = ["0xa1f7cba73ae1b5aa41c3b5c9f06d3f3e404fd25d5f5c7029d2b54948403f173d"]


@pytest.fixture(scope="module")
def deployed(default_account):
    """
    A live product with a funded pool and an approved wording. Studio's shared
    rate limit makes this expensive, so it is module-scoped and every test in
    the module reuses the one deployment.
    """
    factory = get_contract_factory(contract_file_path="contracts/genshield.py")
    contract = factory.deploy(
        # treasury, protocol_fee_bps, min_filing_bond, min_appeal_bond,
        # appeal_window_seconds, appeal_bond_bps
        args=[default_account.address, 500, 10**15, 10**15, 60, 1000],
        account=default_account,
    )
    product_id = int(
        contract.create_product(
            args=["Oracle failure cover", WORDING, HOSTS, RPC, 10, GEN // 10, 5 * GEN, 20000, 5000]
        ).transact()
        or 1
    )
    contract.review_product(args=[product_id]).transact()
    contract.deposit(args=[product_id]).transact(value=2 * GEN)
    return contract, product_id
