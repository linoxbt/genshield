import { clientFor, readContract, awaitTx, addr } from "./lib.mjs";

// treasury, protocol_fee_bps, min_filing_bond_atto, min_appeal_bond_atto,
// appeal_window_seconds, appeal_bond_bps
const treasury = process.env.TREASURY;
const FEE_BPS = 500;
const MIN_FILING_BOND = 10n ** 15n;   // 0.001 GEN
const MIN_APPEAL_BOND = 10n ** 15n;
const APPEAL_WINDOW = Number(process.env.APPEAL_WINDOW ?? 60);
const APPEAL_BOND_BPS = 1000;

const { client, address } = await clientFor(process.env.KS ?? "verify-depositor");
console.log("deployer", address);

const hash = await client.deployContract({
  code: readContract(),
  args: [addr(treasury ?? address), FEE_BPS, MIN_FILING_BOND, MIN_APPEAL_BOND, APPEAL_WINDOW, APPEAL_BOND_BPS],
});
console.log("deploy tx", hash);
const tx = await awaitTx(client, hash, "deploy");
const deployed = tx?.data?.contract_address ?? tx?.contractAddress ?? tx?.data?.contractAddress;
console.log("CONTRACT", deployed);
