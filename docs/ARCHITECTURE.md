# Architecture notes

Design decisions and the reasoning behind them, plus the GenVM and tooling
behaviours that shaped the code. Read this before changing the consensus paths.

## Why the claim path is staged

GenVM will not begin a second non-deterministic block while one is already in
progress inside the same call. The claim flow is therefore four transactions
(`file_claim` → `attach_chain_evidence` → `adjudicate` → `settle`) rather than one
sweep. This is not an ergonomic choice and cannot be collapsed.

Staging also buys a real property: the hard facts are agreed by a *separate*
deterministic round and frozen onto the claim before any judgment happens, so the
narrative round cannot re-derive different receipts alongside its verdict.

## Severity bucketing

`_bucket` quantises a reported loss to one of ten deciles; `_bucket_to_bps` returns
that decile's midpoint. Both the validator comparison and the stored severity go
through it.

Three options existed and two of them are broken:

| Approach | Failure |
|---|---|
| Compare raw `loss_bps` | Two honest independent readings essentially never match. Consensus fails on genuine claims. |
| Compare nothing, store the leader's number | The leader sets every payout alone. The round is theatre. |
| Compare and store the decile | Works. Tolerates honest variance, bounds leader discretion to one bucket. |

Payout is a function of the agreed bucket, never of the leader's own figure. A leader
whose raw number sits inside a legitimately-agreed decile still cannot move the payout.

The cost is granularity: severity resolves to 10 percentage-point steps. That is a
deliberate trade. Finer buckets tighten payouts but raise the consensus failure rate;
`SEVERITY_BUCKETS` is the single knob.

## Why `strict_eq` for chain facts and not for anything else

A JSON-RPC receipt is a deterministic source, so exact match is the correct and
cheapest primitive — but only after the receipt is stripped to fields that cannot
legitimately differ between two honest nodes. `_fetch_chain_facts` keeps status, block
number, from, to, log count and block timestamp, and drops everything else. A single
unstable field left in the canonical form would fail consensus on every claim.

Non-dict RPC results (a pending or unknown hash returns null; a malformed node answer
returns something else) are recorded as `found: false` rather than crashing the round
unclassified.

## Error classification

Four prefixes, because validators need to know how to compare a *failure*:

- `[EXPECTED]` — deterministic business logic. Both sides must produce the identical message.
- `[EXTERNAL]` — a 4xx or an RPC error payload. Deterministic; exact match.
- `[TRANSIENT]` — 5xx or unparseable body. Agree if both sides failed transiently, or a
  single flaky evidence host would force endless validator rotation.
- `[LLM_ERROR]` — malformed or misbehaving model output. Always disagree, forcing
  rotation rather than accepting the answer.

`_handle_leader_error` implements the comparison. `test_validator_consensus.py` covers
both the both-sides-transient agreement and the leader-only-failed disagreement.

## LLM output handling

`_as_dict`, `_coerce_bool` and `_coerce_loss_bps` are deliberately lenient about
*form* and strict about *substance*. A response-format instruction is never fully
binding on free text, so JSON wrapped in prose is recovered by a brace scan and
`"yes"`/`"true"`/`"covered"` are accepted as booleans. But a covered verdict reporting
zero loss, or a severity outside 0–10000, is an `[LLM_ERROR]` — those are substantive
contradictions, not formatting noise.

## Prompt construction order

The prompt places the authoritative policy wording and the consensus-agreed chain
facts *before* the injection notice, and the fetched evidence last, inside explicit
delimiters. Anything an attacker controls therefore appears only after the material it
would need to override, and only inside the fence.

`MAX_EVIDENCE_CHARS_PER_SOURCE` (6000) and `MAX_EVIDENCE_CHARS_TOTAL` (20000) bound
what a hostile host can inject. `test_prompt_hardening.py` asserts on the assembled
prompt via mock regexes rather than trusting the code by inspection.

## Storage layout constraints

Five top-level `TreeMap` fields, and pool state lives *inside* the `Product` dataclass
rather than in maps of its own. This is defensive: a GenVM storage-encoder bug has been
observed on a bigint-bearing dataclass combined with more than five top-level
`TreeMap`s, with no workaround. The layout here was validated by deploying a
field-shape-only skeleton to Studio and reading it back *before* any logic was written.
Keep the map count where it is.

`lp_shares` is keyed `f"{product_id}:{address}"` — a flat map rather than a nested one,
for the same reason.

`DynArray[T](...)` is not constructible. Assign a plain Python list; the storage layer
converts it.

## Known direct-mode testing limitations

`pytest tests/direct` is fast and covers the deterministic logic thoroughly, but three
things it structurally cannot do:

1. **The clock is fixed for the life of a deployed instance.** `direct_vm.warp()` does
   not change what a running contract observes — verified, not assumed. Anything needing
   elapsed time between two calls uses a deploy-time knob instead
   (`appeal_window_seconds=0` for the settlement path, a large window for the appeal
   path). Policy expiry via `release_expired` therefore has no positive direct-mode
   test; it is covered live.

2. **The validator half only runs through `run_validator`.** A normal contract call in
   direct mode executes the leader path alone. `test_validator_consensus.py` replays the
   captured closures explicitly, swapping mocks in between to simulate a validator that
   independently saw something different. Without that file, nothing would test the
   consensus rule at all. Note that a *reverted* call captures no validator, so a replay
   after an expected revert silently picks up whichever validator was captured last.

3. **`prompt_non_comparative` / `prompt_comparative` are unmockable in direct mode.**
   gltest's WASI mock implements `ExecPrompt` but not the `ExecPromptTemplate` host
   request those wrappers issue, so they resolve to `None` regardless of any
   `mock_llm()` registration. This contract uses `gl.nondet.exec_prompt` inside
   `run_nondet_unsafe` throughout, which is both the primitive the design wants and
   fully testable.

`cloudpickle` must be installed for validator replay.

## Tooling behaviours worth knowing

- **A deploy reporting `ACCEPTED` proves nothing about the constructor.** Always read a
  view back immediately. "Contract not found" means the constructor errored. Check
  `txExecutionResultName` is `FINISHED_WITH_RETURN`.
- **`Address` parameters need typed calldata.** A bare JS string passed through
  `genlayer-js` encodes as calldata `str` and fails the schema decode silently, before
  any Python runs, while still reporting success. `scripts/lib.mjs` exports `addr()`,
  which wraps a hex string in `CalldataAddress`. The CLI's `--args` parser has the
  mirror-image trap: it auto-detects any `0x`+40-hex value *as* an address regardless
  of the declared type.
- **The CLI cannot make payable calls.** `genlayer write` hardcodes `value: 0n` with no
  flag to override it. Payable paths must go through `genlayer-js`.
- **Direct-mode account fixtures are raw 20-byte values**, not `Address` objects, and
  `genlayer` is not importable from the test process. `_as_address` in the contract
  coerces so the parameter can stay declared as `Address`.
- **Studio Network limits**: roughly 30 requests per minute and 5000 per day, shared.
  Pace write batches with a foreground wait loop; backgrounded sleeps do not reliably
  elapse real time in every environment.

## Design choices left deliberately simple

- **Review is one-shot.** A rejected product is permanently unable to sell, and the
  underwriter must create a new one. Allowing wording to be amended and re-reviewed
  would be friendlier, but it adds a path where wording changes after capital arrives;
  recreating a product is cheap.
- **One appeal per claim.** Bounded cost, bounded latency. The bond scales with what is
  at stake, so appealing a large payout is not cheap.
- **The filing bond is returned on a successful claim.** It prices spam, not losses.
- **No protocol fee on payouts.** Fees are taken only from forfeited bonds, so a paid
  claim is paid whole.
