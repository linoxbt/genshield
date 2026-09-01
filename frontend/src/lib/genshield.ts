import { createClient } from "genlayer-js";
import { CalldataAddress } from "genlayer-js/types";
import type { Address, CalldataEncodable } from "genlayer-js/types";
import { CHAIN, RPC_URL, requireAddress } from "./genlayerConfig";
import type { EIP1193Provider } from "./walletProvider";
import type { AdjudicationRound, Claim, Policy, Product, Quote, Stats } from "./types";

/**
 * Every call goes to the live contract. There is no mock-data fallback: if a
 * read fails, the UI says so rather than showing invented state.
 */

let reader: ReturnType<typeof createClient> | undefined;

function readClient() {
  if (!reader) reader = createClient({ chain: CHAIN, endpoint: RPC_URL });
  return reader;
}

function writeClient(provider: EIP1193Provider, account: Address) {
  return createClient({
    chain: CHAIN,
    endpoint: RPC_URL,
    provider: provider as never,
    account,
  });
}

/**
 * A bare hex string encodes as calldata `str`, which does not match a
 * parameter declared `Address` - the call then fails during decode, before
 * any contract code runs, while still reporting success. Wrap it.
 */
export function asAddress(hex: string): CalldataAddress {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new CalldataAddress(bytes);
}

async function read<T>(functionName: string, args: CalldataEncodable[] = []): Promise<T> {
  return (await readClient().readContract({
    address: requireAddress(),
    functionName,
    args,
  })) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads can lag a few seconds behind a just-finalised write. Retry with
 * backoff rather than failing on the first miss.
 */
export async function retryRead<T>(fn: () => Promise<T | undefined>, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      if (result !== undefined) return result;
    } catch {
      /* fall through to retry */
    }
    if (i < attempts - 1) await sleep(1500 * (i + 1));
  }
  return undefined;
}

function receiptFailed(receipt: unknown): boolean {
  return (
    (receipt as { txExecutionResultName?: string } | undefined)?.txExecutionResultName ===
    "FINISHED_WITH_ERROR"
  );
}

/**
 * A round that calls an LLM across every validator comfortably exceeds the
 * ~30s genlayer-js waits by default, which surfaces as a spurious "did not
 * finalize" on a write that is still genuinely in flight.
 */
async function send(
  signer: { provider: EIP1193Provider; account: Address },
  functionName: string,
  args: CalldataEncodable[],
  value: bigint = 0n,
  retries = 80
): Promise<string> {
  const client = writeClient(signer.provider, signer.account);
  const hash = await client.writeContract({
    address: requireAddress(),
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({ hash, interval: 3000, retries });
  if (receiptFailed(receipt)) {
    throw new Error(`${functionName} reverted on-chain (tx ${hash}).`);
  }
  return hash as string;
}

// ---------------------------------------------------------------- reads

type RawProduct = Record<string, string | string[]>;

function toProduct(p: RawProduct): Product {
  return {
    id: p.id as string,
    underwriter: p.underwriter as string,
    name: p.name as string,
    wording: p.wording as string,
    evidenceHosts: (p.evidence_hosts as string[]) ?? [],
    chainRpc: p.chain_rpc as string,
    rateBpsPerDay: p.rate_bps_per_day as string,
    minCoverageAtto: p.min_coverage_atto as string,
    maxCoverageAtto: p.max_coverage_atto as string,
    maxLeverageBps: p.max_leverage_bps as string,
    utilSlopeBps: p.util_slope_bps as string,
    capitalAtto: p.capital_atto as string,
    lockedAtto: p.locked_atto as string,
    premiumAtto: p.premium_atto as string,
    totalShares: p.total_shares as string,
    capacityAtto: p.capacity_atto as string,
    reviewState: p.review_state as Product["reviewState"],
    reviewNote: p.review_note as string,
    createdAt: p.created_at as string,
  };
}

export async function getStats(): Promise<Stats> {
  const s = await read<Record<string, string>>("stats");
  return {
    products: s.products,
    policies: s.policies,
    claims: s.claims,
    capitalAtto: s.capital_atto,
    lockedAtto: s.locked_atto,
    premiumAtto: s.premium_atto,
  };
}

export async function listProducts(limit = 50): Promise<Product[]> {
  const rows = await read<RawProduct[]>("list_products", [0, limit]);
  return rows.map(toProduct);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  try {
    return toProduct(await read<RawProduct>("get_product", [Number(id)]));
  } catch {
    return undefined;
  }
}

export async function getPolicy(id: string): Promise<Policy | undefined> {
  try {
    const p = await read<Record<string, string>>("get_policy", [Number(id)]);
    return {
      id: p.id,
      productId: p.product_id,
      holder: p.holder,
      coverageAtto: p.coverage_atto,
      premiumPaidAtto: p.premium_paid_atto,
      startsAt: p.starts_at,
      expiresAt: p.expires_at,
      state: p.state as Policy["state"],
      claimCount: p.claim_count,
    };
  } catch {
    return undefined;
  }
}

export async function getClaim(id: string): Promise<Claim | undefined> {
  try {
    const c = await read<Record<string, unknown>>("get_claim", [Number(id)]);
    return {
      id: c.id as string,
      policyId: c.policy_id as string,
      claimant: c.claimant as string,
      evidenceUrls: (c.evidence_urls as string[]) ?? [],
      chainTxHashes: (c.chain_tx_hashes as string[]) ?? [],
      filingBondAtto: c.filing_bond_atto as string,
      chainFactsJson: c.chain_facts_json as string,
      rounds: (c.rounds as AdjudicationRound[]) ?? [],
      verdict: c.verdict as Claim["verdict"],
      lossBps: c.loss_bps as string,
      payoutAtto: c.payout_atto as string,
      state: c.state as Claim["state"],
      appealBondAtto: c.appeal_bond_atto as string,
      appellant: c.appellant as string,
      appealCount: c.appeal_count as string,
      filedAt: c.filed_at as string,
      adjudicatedAt: c.adjudicated_at as string,
    };
  } catch {
    return undefined;
  }
}

/**
 * The contract has no list view for policies or claims - ids are sequential
 * from 1, and `stats` reports how many exist, so walk the range.
 */
export async function listPolicies(): Promise<Policy[]> {
  const { policies } = await getStats();
  const ids = Array.from({ length: Number(policies) }, (_, i) => String(i + 1));
  const rows = await Promise.all(ids.map(getPolicy));
  return rows.filter((p): p is Policy => Boolean(p));
}

export async function listClaims(): Promise<Claim[]> {
  const { claims } = await getStats();
  const ids = Array.from({ length: Number(claims) }, (_, i) => String(i + 1));
  const rows = await Promise.all(ids.map(getClaim));
  return rows.filter((c): c is Claim => Boolean(c));
}

export async function getQuote(
  productId: string,
  coverageAtto: bigint,
  days: number
): Promise<Quote> {
  const q = await read<Record<string, string>>("quote", [Number(productId), coverageAtto, days]);
  return {
    premiumAtto: q.premium_atto,
    coverageAtto: q.coverage_atto,
    days: q.days,
    capacityAtto: q.capacity_atto,
    lockedAtto: q.locked_atto,
  };
}

export async function sharesOf(productId: string, holder: string): Promise<string> {
  return read<string>("shares_of", [Number(productId), asAddress(holder)]);
}

export async function shareValue(productId: string, shares: string): Promise<string> {
  return read<string>("share_value", [Number(productId), BigInt(shares)]);
}

// --------------------------------------------------------------- writes

type Signer = { provider: EIP1193Provider; account: Address };

export const createProduct = (
  s: Signer,
  p: {
    name: string;
    wording: string;
    evidenceHosts: string[];
    chainRpc: string;
    rateBpsPerDay: number;
    minCoverageAtto: bigint;
    maxCoverageAtto: bigint;
    maxLeverageBps: number;
    utilSlopeBps: number;
  }
) =>
  send(s, "create_product", [
    p.name,
    p.wording,
    p.evidenceHosts,
    p.chainRpc,
    p.rateBpsPerDay,
    p.minCoverageAtto,
    p.maxCoverageAtto,
    p.maxLeverageBps,
    p.utilSlopeBps,
  ]);

export const reviewProduct = (s: Signer, id: string) =>
  send(s, "review_product", [Number(id)]);

export const deposit = (s: Signer, id: string, value: bigint) =>
  send(s, "deposit", [Number(id)], value);

export const withdraw = (s: Signer, id: string, shares: bigint) =>
  send(s, "withdraw", [Number(id), shares]);

export const buyPolicy = (
  s: Signer,
  id: string,
  coverageAtto: bigint,
  days: number,
  premium: bigint
) => send(s, "buy_policy", [Number(id), coverageAtto, days], premium);

export const fileClaim = (
  s: Signer,
  policyId: string,
  evidenceUrls: string[],
  txHashes: string[],
  bond: bigint
) => send(s, "file_claim", [Number(policyId), evidenceUrls, txHashes], bond);

export const attachChainEvidence = (s: Signer, claimId: string) =>
  send(s, "attach_chain_evidence", [Number(claimId)]);

export const adjudicate = (s: Signer, claimId: string) =>
  send(s, "adjudicate", [Number(claimId)]);

export const appeal = (s: Signer, claimId: string, bond: bigint) =>
  send(s, "appeal", [Number(claimId)], bond);

export const settle = (s: Signer, claimId: string) => send(s, "settle", [Number(claimId)]);

export const releaseExpired = (s: Signer, policyId: string) =>
  send(s, "release_expired", [Number(policyId)]);
