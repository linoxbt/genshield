# GenShield — GenLayer Portal submission

Copy-paste content for the Project submission form. Field headings match the form.

---

## 01 · Identity

**Logo** — `frontend/public/logo-512.png` (512×512 PNG, within the 128–2048 px range).

**Project name**

```
GenShield
```

**Primary tag** — pick `DeFi` from the dropdown (the form only allows one, chosen from
its own list).

**Tag 1 / Tag 2** — `Insurance` and `Oracles` if offered; otherwise the two closest to
insurance and consensus/verification.

---

## 02 · Project summary

**One-liner** (180 max — this is 164)

```
DeFi cover where the policy wording is the settlement logic: the contract fetches its own evidence and two validators must agree on the same verdict before it pays.
```

---

## 03 · Project overview

**Description** (1000 max — this is 969)

```
On-chain insurance has never had a custody problem. It has a specification problem. A payout condition must be encoded as a parametric trigger long before anyone knows what the failure will look like, so cover either fires on events that were not really losses or misses the loss that happened. Fixing that by importing judgment from off-chain puts back the thing on-chain insurance was meant to remove: a party who decides.

GenShield keeps the coverage wording in plain language and makes the wording itself the settlement logic. An underwriter opens a product with the wording and the hosts whose reporting counts as evidence. LPs fund the risk pool and take premium; policyholders buy cover priced off a per-day rate and pool utilisation.

When a claim is filed, the contract gathers its own evidence — receipts from the insured chain, incident reporting from the allowlisted hosts — and reads it against the wording under GenVM consensus. There is no resolver key.
```

---

## 04 · Demo video

Leave blank. No video recorded.

---

## 05 · How-to

Steps a steward can complete without holding any funds — `create_product` and
`review_product` are both non-payable, and Studio is gasless.

**Step 01** — *Open the app*
```
Go to https://genshield-728.netlify.app and open Products from the menu (the button at the top right).
```

**Step 02** — *Read a wording that failed review*
```
Open "Broad protocol cover" (product 1). It is marked REJECTED. Read the policy wording, then the Underwriting review panel below it: validators refused it because "any loss" names no particular failure event that could be objectively verified from the listed evidence sources.
```

**Step 03** — *Read a wording that passed*
```
Go back and open "Oracle failure cover" (product 2). It insures a specific failure with a quantified 20 percent threshold, tied to what published reporting states. It is APPROVED, and its pool holds 2 GEN of capital.
```

**Step 04** — *Connect a wallet*
```
Click Connect wallet and connect on GenLayer Studio Network (chain 61999). You do not need any balance for the following steps.
```

**Step 05** — *Write a wording that cannot be settled*
```
Open Underwrite from the menu. Give the product any name, and for the wording enter something deliberately unsettleable, for example: "This policy pays out whenever the covered protocol behaves unfairly towards its users." Leave the evidence host as rekt.news and the RPC as the prefilled endpoint. Submit.
```

**Step 06** — *Run the underwriting round*
```
You land on the new product's page, marked PENDING. Click "Run underwriting review". This starts a real consensus round: a leader and a validator each independently judge whether the wording could be settled objectively, and must agree on the boolean. It takes up to a minute.
```

**Step 07** — *Read the verdict*
```
The product flips to REJECTED and shows the validators' own one-sentence reasoning. It can never sell a policy. Confirm this by noting that the Buy cover panel refuses to quote for it.
```

**Step 08** — *Optional: watch the same gate approve*
```
Repeat steps 05 and 06 with a wording that names a specific failure and a quantified threshold, for example: "This policy covers loss of principal where published incident reporting states the protocol price oracle published a price more than 20 percent away from the asset's open-market price at the same time." It is APPROVED, and Buy cover becomes available.
```

---

## 06 · Review verification

**Expected verification outcome** (500 max — this is 494)

```
After step 06 the steward's own product flips from PENDING to REJECTED, with a one-sentence note written by the validators in that round explaining which part of the wording cannot be settled from evidence — wording that will differ from run to run, because it is generated, not canned. The product then cannot be quoted or sold. Step 08 produces the opposite result on quantified wording. Two products already exist on-chain: product 1 REJECTED, product 2 APPROVED with a funded 2 GEN pool.
```

**Contract link 1**

```
https://explorer-studio.genlayer.com/address/0x7B9f0D4bB45d6d21b42D060bD276C594381Ce3e3
```

---

## 07 · Project links

**Website** (required)

```
https://genshield-728.netlify.app
```

**GitHub**

```
https://github.com/linoxbt/genshield
```

---

## Evidence & Supporting Information

**GitHub Repository**

```
https://github.com/linoxbt/genshield
```

---

## What is actually on-chain right now

Contract `0x7B9f0D4bB45d6d21b42D060bD276C594381Ce3e3` on Studio Network:

| | |
|---|---|
| Products | 2 — one REJECTED at review, one APPROVED |
| Pool capital | 2 GEN |
| Cover in force | 0 GEN |
| Claims | 0 |

The rejection was not staged, and it is regenerated per run rather than stored. On
this deployment the gate refused product 1 with:

> "The term 'any loss' is overly broad and subjective, failing to specify a particular
> failure event or technical trigger that can be objectively verified through the listed
> evidence sources."

and approved product 2 with:

> "It specifies an observable trigger on a specific system — the protocol's oracle price
> being over 20% off the contemporaneous open-market price — and coverage can be checked
> against rekt.news incident reporting plus the insured's transaction receipts."

A steward running step 06 will get their own wording judged, in words this run has not
seen before.

---

## Status notes — not part of the form

Honest scope of what has been exercised, so the how-to above only claims what holds.

**Live on Studio:** product creation, the underwriting review round (both verdicts,
against real validators), LP deposits, and buying a policy. The how-to path covers only
these.

**Implemented and unit-tested, but never yet run live:** the claim path —
`file_claim` → `attach_chain_evidence` → `adjudicate` → `settle`, plus `appeal` and
`release_expired`. 110 direct-mode tests cover it, including validator-closure replay
that exercises the agreement rule itself rather than only the leader's path. It is not
in the how-to because Studio's shared 5000-request daily write quota has blocked the
end-to-end run, and a steward should not be sent down a path that has not been walked.

Two rounds in that path fetch the open web from inside the contract
(`attach_chain_evidence` hits an Ethereum RPC, `adjudicate` fetches an incident report),
so whether validators can reach those hosts is genuinely unknown until it runs. Worth
completing before claiming the full lifecycle anywhere public.

---

## Resubmission response (paste into the Portal)

Both requests are addressed. The contract was redeployed, so **the address has changed
to `0x7B9f0D4bB45d6d21b42D060bD276C594381Ce3e3`**.

**1. Active coverage now stays reserved.**

Confirmed and fixed. `settle()` released the reservation unconditionally and then
returned a rejected claim's policy to ACTIVE, leaving a policy that could be claimed
again for the full sum insured while `locked_atto` no longer accounted for it. That is
not cosmetic: both solvency gates read `locked_atto`, so an LP could withdraw capital
still standing behind live cover, and a product could write more cover than it could
honour.

Cover is now released only when the policy actually closes:

- claim upheld — CLAIMED, released
- claim rejected, policy already lapsed — EXPIRED, released
- claim rejected, policy still live — ACTIVE, reservation kept

`release_expired` frees it later, when the policy genuinely lapses.

Worth flagging plainly: our own test had asserted the bug, requiring `locked_atto == 0`
and `state == "ACTIVE"` at once. The corrected assertions were confirmed failing against
the old contract before the fix landed, and a new test withdraws against the retained
reservation and expects refusal. 111 direct-mode tests pass.

**2. Frontend writes are finality-safe.**

Two defects, plus a third found while fixing them:

- `waitForTransactionReceipt` was called without a `status`, so it defaulted to ACCEPTED
  and returned on any decided state. `DECIDED_STATES` includes UNDETERMINED, CANCELED,
  LEADER_TIMEOUT and VALIDATORS_TIMEOUT, so a failed transaction was presented as a
  completed action.
- `_pay` emits every transfer with `on="finalized"`. At ACCEPTED no payout, refund or
  withdrawal has actually moved, so reporting completion there was wrong about the
  user's money.
- The first execution check used `txExecutionResultName`, which is empty on Studio's raw
  transaction — a no-op that would still pass a reverted-but-finalized transaction. The
  signal that works is `consensus_data.leader_receipt[].execution_result`.

Writes now poll to FINALIZED and fail explicitly on the terminal failure states, naming
the state and the hash. The UI reports submitted, accepted and finalized as distinct
phases and says while accepted that nothing has transferred yet. In-flight hashes are
persisted before the wait begins, so a reload during the pre-finality window does not
lose the only handle on a transaction. Value-moving actions reconcile after
finalization: the payout shown is read back from the settled claim rather than inferred
from the arguments submitted.

**How-to:** steps 02 and 03 now point at product 1 ("Broad protocol cover", REJECTED)
and product 2 ("Oracle failure cover", APPROVED, 2 GEN pool) on the new deployment. The
rest of the path is unchanged and still requires no balance.

**Commits:** `0880552` (both fixes), `d9e6d81` (redeploy and repoint).

**Scope we are not claiming:** the claim path — file, attach chain evidence, adjudicate,
settle — is implemented and covered by the direct-mode suite, including the reservation
behaviour above, but has not yet been exercised end to end on-chain. It is deliberately
kept out of the verification path until it has been.
