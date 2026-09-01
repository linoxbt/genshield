# GenShield

Insurance for DeFi protocols, underwritten on written policy wording and settled
without an adjudicator.

A GenLayer Intelligent Contract. Live on Studio Network at
`0x6898260794B453dc671735F2e5388B54a118ab01`.

## Why this is not a parametric-trigger product

On-chain insurance has never had a custody problem. It has a *specification*
problem. A payout condition has to be encoded as a parametric trigger long before
anyone knows what the failure will actually look like, so cover either fires on
events that were not really losses, or misses the loss that happened. Every attempt
to fix that by importing judgment from off-chain puts back the thing on-chain
insurance was supposed to remove: a party who decides.

GenShield keeps the coverage wording in natural language and makes the wording
itself the settlement logic. An underwriter opens a product with the wording, the
hosts whose reporting counts as admissible evidence, and a JSON-RPC endpoint for the
chain being insured. LPs fund the risk pool and take premium pro rata. Policyholders
buy cover priced deterministically off a per-day rate and the pool's own utilisation.

When a policyholder claims, the contract gathers its own evidence — receipts pulled
straight from the insured chain's RPC, incident reporting fetched from the
allowlisted hosts — and reads that evidence against the policy wording under GenVM
consensus. There is no resolver key. Anyone can push a claim to its next stage, and
the answer is whatever independent validators agree the wording and the evidence say.

## The three consensus decisions

They are deliberately not the same primitive.

**1. Chain facts — `strict_eq`.** `attach_chain_evidence` posts
`eth_getTransactionReceipt` and `eth_getBlockByNumber` to the product's declared RPC,
then strips each receipt to fields two honest nodes cannot disagree about: status,
block number, from, to, log count, block timestamp. Confirmation counts and gas-price
fields are dropped rather than trusted — leaving one in would turn every claim into a
consensus failure. The snapshot is frozen onto the claim, so the later judgment round
cannot quietly re-derive a different set of hard facts.

**2. The verdict — `run_nondet_unsafe`.** `adjudicate` moves other people's capital,
so the validator redoes the entire job: its own fetch of the evidence, its own
reading of the wording. It never inspects the leader's answer for plausibility. A
validator that only checked the leader's JSON for a well-formed shape and an in-range
severity would be letting the leader decide every payout alone while looking like
consensus.

Agreement requires an exact match on covered/not-covered and, when covered, that both
sides land in the same **severity decile**.

> The bucketing is load-bearing, not a convenience. Two independent readings of the
> same incident will never produce the same raw loss percentage, so comparing raw
> severity would fail consensus on almost every genuine claim; comparing nothing would
> let the leader set the payout unilaterally. Quantising to ten buckets before both
> comparison *and* storage is what makes a judged payout amount consensus-safe at all,
> and it is why the payout is computed from the agreed bucket's midpoint rather than
> from the leader's number.

**3. Whether the wording can be settled at all — `review_product`.** One round, before
any capital stands behind the product, decides whether the wording is specific enough
to be settled from the nominated evidence. A product that fails review can never sell
a policy.

This gate is not decorative. On its first live run it rejected two real draft
wordings, correctly:

> "The trigger turns on whether an oracle price 'deviates materially' from the asset's
> 'true market price,' but those key benchmarks are not objectively defined in the
> wording, so a reader could not settle coverage from rekt.news and receipts alone
> without subjective judgment."

> "The wording depends on proving the 'deliberate' intent of a trader, which is a
> subjective fact that cannot be definitively observed through on-chain data or
> reporting."

Both wordings were approved once a quantified deviation threshold replaced "materially"
and an observable sequence of trades replaced the finding of intent.

## Claim lifecycle

```
create_product   underwriter fixes wording, evidence hosts, insured chain RPC
review_product   consensus round 1  - is this wording adjudicable at all?
deposit          LP mints pool shares against the pool's current value
quote            deterministic: per-day rate x cover x days, plus a utilisation surcharge
buy_policy       premium joins the pool as capital; cover is locked against capacity
file_claim       holder posts a filing bond, cites evidence URLs and tx hashes
attach_chain_evidence   consensus round 2 - strict_eq over the insured chain's RPC
adjudicate       consensus round 3 - the verdict and the severity decile
appeal           one bonded rerun, open to anyone with a stake in the answer
settle            deterministic payout, bond handling, pool accounting
```

Each non-deterministic step is its own transaction: GenVM will not begin a second
non-deterministic block while one is already in progress inside the same call.

## Prompt injection is a live threat here, not a theoretical one

The claimant chooses the evidence URLs, which makes a crafted page a direct path to
the pool. Two defences sit in the contract:

- **Host allowlist.** The underwriter fixes admissible evidence hosts when the product
  is created. A claimant can cite the protocol's own postmortem but not a page they
  control. Enforced in `file_claim`, before anything is fetched.
- **Fenced evidence.** Fetched content is delimited and labelled as untrusted data
  under a standing instruction that text inside the fence is evidence to be weighed
  and never instructions to be followed, with per-source and total length caps so one
  huge page cannot crowd the policy wording out of the context.

`tests/direct/test_prompt_hardening.py` asserts on the prompt the model actually
receives — a missing fence or missing warning surfaces as an unmatched-mock error.

## Solvency

Enforced where the risk is taken, not reconciled afterwards.

- A product cannot write cover beyond `capital x max_leverage_bps / 10000`.
- Capital backing live policies cannot be withdrawn.
- LP accounting is **share-based**. Depositors mint shares against the pool's current
  value, so a payout dilutes every LP proportionally at the moment it happens. Flat
  per-depositor balance tracking looks equivalent and quietly lets whoever exits first
  take the remaining capital at par after a loss, leaving the stragglers short.

## Tests

```bash
pip install genlayer-py genlayer-test genvm-linter pytest python-dotenv cloudpickle
genvm-lint check contracts/genshield.py
pytest tests/direct -q          # 110 tests
```

`tests/direct/test_validator_consensus.py` is the one that matters most: it replays
the captured validator closures through gltest's `run_validator` cheatcode, swapping
the mocks in between, so the consensus rule is genuinely exercised rather than only
the leader's path. It covers agreement inside a decile, disagreement across deciles,
disagreement on the verdict, rejection of a forged leader result, and the failure-path
comparison rules.

Live tests in `tests/integration/` need a raw key in a gitignored config and are not
part of the default run. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for what
direct mode can and cannot cover.

## Scripts

`scripts/` drives a deployed contract through `genlayer-js`. The CLI's `write` command
hardcodes `value: 0n` and cannot call a payable method at all, and most of the
interesting paths here are payable.

```bash
GENSHIELD_PW=<keystore password> node scripts/deploy.mjs
GENSHIELD_PW=<keystore password> scripts/smoke.sh <address> create
```

Keystores are decrypted in memory only — no raw private key is written to disk or
printed.
