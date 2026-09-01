#!/usr/bin/env bash
# End-to-end exercise of a deployed GenShield against real evidence.
# Usage: GENSHIELD_PW=... scripts/smoke.sh <contract-address> <step>
set -euo pipefail
C="$1"; STEP="${2:-all}"
cd "$(dirname "$0")/.."

UNDERWRITER=verify-depositor
HOLDER=verify-counterparty

WORDING_ORACLE='This policy covers loss of principal on the covered lending protocol where published incident reporting states that the loss was caused by the protocol price oracle publishing a price for a collateral asset that was more than 20 percent away from the price at which that asset was actually trading on the open market at the same time. Loss is NOT covered where the reporting states that the asset price used by the protocol was the real market price at the time, including where that market price had itself been moved by open-market buying or selling. If the reporting explicitly states the incident was not an oracle failure, this policy does not respond.'

WORDING_MANIP='This policy covers loss of principal on the covered lending protocol where published incident reporting describes ALL of the following: a trader took offsetting positions across more than one account in the same asset; the market price of that asset rose by more than 100 percent as a result; and the trader then borrowed or withdrew value against the inflated position, leaving the protocol with bad debt. No finding about the trader intent is required - only that the reporting describes this sequence. An ordinary decline in the value of an asset is not covered.'

HOSTS='["rekt.news"]'
RPC=https://ethereum-rpc.publicnode.com
EVIDENCE='["https://rekt.news/mango-markets-rekt"]'
TXS='["0xa1f7cba73ae1b5aa41c3b5c9f06d3f3e404fd25d5f5c7029d2b54948403f173d"]'

GEN=1000000000000000000
POL1="${POL1:-1}"
POL2="${POL2:-2}"
P1="${P1:-1}"
P2="${P2:-2}"
C1="${C1:-1}"
C2="${C2:-2}"

pace () { local n=${1:-20}; local s=$(date +%s); until [ $(( $(date +%s) - s )) -ge "$n" ]; do sleep 5; done; }

w () { KS="$1" node scripts/write.mjs "$C" "${@:2}"; }
r () { node scripts/call.mjs "$C" "$@"; }

case "$STEP" in
create)
  w $UNDERWRITER create_product 0 "Oracle failure cover" "$WORDING_ORACLE" "$HOSTS" "$RPC" 10 $((GEN/10)) $((5*GEN)) 20000 5000
  pace 20
  w $UNDERWRITER create_product 0 "Price manipulation cover" "$WORDING_MANIP" "$HOSTS" "$RPC" 10 $((GEN/10)) $((5*GEN)) 20000 5000
  ;;
review)
  w $UNDERWRITER review_product 0 $P1; pace 25
  w $UNDERWRITER review_product 0 $P2
  r get_product $P1; r get_product $P2
  ;;
fund)
  w $UNDERWRITER deposit $((2*GEN)) $P1; pace 20
  w $UNDERWRITER deposit $((2*GEN)) $P2
  ;;
buy)
  r quote $P1 $GEN 30
  w $HOLDER buy_policy $((GEN/10)) $P1 $GEN 30; pace 20
  w $HOLDER buy_policy $((GEN/10)) $P2 $GEN 30
  ;;
claim)
  w $HOLDER file_claim $((GEN/100)) $POL1 "$EVIDENCE" "$TXS"; pace 20
  w $HOLDER file_claim $((GEN/100)) $POL2 "$EVIDENCE" "$TXS"
  ;;
evidence)
  w $UNDERWRITER attach_chain_evidence 0 $C1; pace 25
  w $UNDERWRITER attach_chain_evidence 0 $C2
  r get_claim $C1
  ;;
adjudicate)
  w $UNDERWRITER adjudicate 0 $C1; pace 30
  w $UNDERWRITER adjudicate 0 $C2
  r get_claim $C1; r get_claim $C2
  ;;
settle)
  w $UNDERWRITER settle 0 $C1; pace 20
  w $UNDERWRITER settle 0 $C2
  r get_claim $C1; r get_claim $C2; r stats
  ;;
state)
  r stats; r get_product $P1; r get_product $P2
  ;;
*)
  echo "steps: create review fund buy claim evidence adjudicate settle state"; exit 1;;
esac
