import pytest

from conftest import GEN, make_product, mock_review


def approved(contract, vm, sender, **overrides):
    pid = make_product(contract, vm, sender, **overrides)
    mock_review(vm, adjudicable=True)
    vm.sender = sender
    contract.review_product(pid)
    return pid


def test_first_deposit_mints_one_share_per_unit(contract, direct_vm, direct_alice):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 50 * GEN
    minted = contract.deposit(pid)
    direct_vm.value = 0
    assert int(minted) == 50 * GEN
    p = contract.get_product(pid)
    assert p["capital_atto"] == str(50 * GEN)
    assert p["total_shares"] == str(50 * GEN)


def test_second_depositor_gets_shares_at_current_value(
    contract, direct_vm, direct_alice, direct_bob
):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 50 * GEN
    contract.deposit(pid)
    direct_vm.sender = direct_bob
    direct_vm.value = 25 * GEN
    minted = contract.deposit(pid)
    direct_vm.value = 0
    assert int(minted) == 25 * GEN
    assert contract.get_product(pid)["total_shares"] == str(75 * GEN)


def test_deposit_requires_value(contract, direct_vm, direct_alice):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 0
    with direct_vm.expect_revert("deposit requires value"):
        contract.deposit(pid)


def test_premium_scales_with_cover_and_duration(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    # rate is 10 bps/day: 10 GEN of cover for 30 days = 0.3 GEN before surcharge
    base = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    assert base == 10 * GEN * 10 * 30 // 10000
    assert int(contract.quote(pid, 20 * GEN, 30)["premium_atto"]) == base * 2
    assert int(contract.quote(pid, 10 * GEN, 60)["premium_atto"]) == base * 2


def test_premium_rises_with_utilisation(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    idle = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])

    direct_vm.value = idle
    contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 0
    busy = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    assert busy > idle


def test_quote_rejects_out_of_bounds_requests(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("coverage outside product bounds"):
        contract.quote(pid, 500 * GEN, 30)
    with direct_vm.expect_revert("days must be"):
        contract.quote(pid, 10 * GEN, 0)
    with direct_vm.expect_revert("days must be"):
        contract.quote(pid, 10 * GEN, 400)


def test_quote_needs_capital(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("has no capital"):
        contract.quote(pid, 10 * GEN, 30)


def test_buy_policy_locks_cover_and_credits_premium(
    contract, direct_vm, direct_alice, direct_bob
):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    policy_id = contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 0

    p = contract.get_product(pid)
    assert p["locked_atto"] == str(10 * GEN)
    assert p["capital_atto"] == str(100 * GEN + premium)
    assert p["premium_atto"] == str(premium)
    # Premium raises capital without minting shares, so it accrues to the LP.
    assert p["total_shares"] == str(100 * GEN)

    pol = contract.get_policy(policy_id)
    assert pol["state"] == "ACTIVE"
    assert pol["coverage_atto"] == str(10 * GEN)


def test_buy_policy_rejects_underpayment(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.value = 100 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium - 1
    with direct_vm.expect_revert("Premium is"):
        contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 0


def test_capacity_is_capped_by_leverage(contract, direct_vm, direct_alice, direct_bob):
    # 10 GEN of capital at 2x leverage backs at most 20 GEN of cover.
    pid = approved(contract, direct_vm, direct_alice, max_leverage_bps=20000)
    direct_vm.value = 10 * GEN
    contract.deposit(pid)
    direct_vm.value = 0
    direct_vm.sender = direct_bob

    for _ in range(2):
        premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
        direct_vm.value = premium
        contract.buy_policy(pid, 10 * GEN, 30)
        direct_vm.value = 0

    premium = int(contract.quote(pid, 10 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    with direct_vm.expect_revert("capacity exhausted"):
        contract.buy_policy(pid, 10 * GEN, 30)
    direct_vm.value = 0


def test_withdraw_returns_share_of_pool(contract, direct_vm, direct_alice):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 40 * GEN
    shares = int(contract.deposit(pid))
    direct_vm.value = 0
    got = int(contract.withdraw(pid, shares // 2))
    assert got == 20 * GEN
    assert contract.get_product(pid)["capital_atto"] == str(20 * GEN)
    assert contract.shares_of(pid, direct_alice) == str(shares // 2)


def test_withdraw_cannot_take_locked_capital(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 20 * GEN
    shares = int(contract.deposit(pid))
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    premium = int(contract.quote(pid, 15 * GEN, 30)["premium_atto"])
    direct_vm.value = premium
    contract.buy_policy(pid, 15 * GEN, 30)
    direct_vm.value = 0

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("break solvency"):
        contract.withdraw(pid, shares)


def test_withdraw_rejects_more_shares_than_held(contract, direct_vm, direct_alice, direct_bob):
    pid = approved(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 20 * GEN
    shares = int(contract.deposit(pid))
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Insufficient shares"):
        contract.withdraw(pid, shares)
