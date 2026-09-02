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
Open "Oracle failure cover" (product 1). It is marked REJECTED. Read the policy wording, then read the Underwriting review panel below it: validators refused this wording because "deviates materially" and "true market price" are not objectively defined, so no one could settle a claim from evidence alone.
```

**Step 03** — *Read a wording that passed*
```
Go back and open product 3. Same risk, but the threshold is quantified at 20 percent and the trigger is tied to what published reporting states. It is APPROVED, and its pool holds 2 GEN of capital.
```

**Step 04** — *Connect a wallet*
```
Click Connect wallet and connect on GenLayer Studio Network (chain 61999). You do not need any balance for the following steps.
```

**Step 05** — *Write a wording that cannot be settled*
```
Open Underwrite from the menu. Give the product any name, and for the wording enter something deliberately unsettleable, for example: "This policy compensates the insured for any loss they suffer on the covered protocol." Leave the evidence host as rekt.news and the RPC as the prefilled endpoint. Submit.
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
After step 06 the steward's own product flips from PENDING to REJECTED, with a one-sentence note written by the validators in that round explaining which part of the wording cannot be settled from evidence — wording that will differ from run to run, because it is generated, not canned. The product then cannot be quoted or sold. Step 08 produces the opposite result on quantified wording. Four products already exist on-chain from earlier runs: 1 and 2 REJECTED, 3 and 4 APPROVED and funded.
```

**Contract link 1**

```
https://explorer-studio.genlayer.com/address/0x6898260794B453dc671735F2e5388B54a118ab01
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

Contract `0x6898260794B453dc671735F2e5388B54a118ab01` on Studio Network:

| | |
|---|---|
| Products | 4 — two REJECTED at review, two APPROVED |
| Pool capital | 4.03 GEN |
| Cover in force | 1 GEN |
| Premium earned | 0.03 GEN |
| Claims | 0 |

The two rejections were not staged. They were the first two wordings written for this
contract, and the gate refused both:

> "The trigger turns on whether an oracle price 'deviates materially' from the asset's
> 'true market price,' but those key benchmarks are not objectively defined in the
> wording, so a reader could not settle coverage from rekt.news and receipts alone
> without subjective judgment."

> "The wording depends on proving the 'deliberate' intent of a trader, which is a
> subjective fact that cannot be definitively observed through on-chain data or
> reporting."

Both were approved after the threshold was quantified and the intent finding removed.

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
