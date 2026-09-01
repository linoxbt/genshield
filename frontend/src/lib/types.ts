export type ReviewState = "PENDING" | "APPROVED" | "REJECTED";
export type PolicyState = "ACTIVE" | "CLAIMING" | "CLAIMED" | "EXPIRED";
export type ClaimState = "FILED" | "EVIDENCED" | "ADJUDICATED" | "APPEALED" | "SETTLED";
export type Verdict = "" | "COVERED" | "NOT_COVERED";

export interface Product {
  id: string;
  underwriter: string;
  name: string;
  wording: string;
  evidenceHosts: string[];
  chainRpc: string;
  rateBpsPerDay: string;
  minCoverageAtto: string;
  maxCoverageAtto: string;
  maxLeverageBps: string;
  utilSlopeBps: string;
  capitalAtto: string;
  lockedAtto: string;
  premiumAtto: string;
  totalShares: string;
  capacityAtto: string;
  reviewState: ReviewState;
  reviewNote: string;
  createdAt: string;
}

export interface Policy {
  id: string;
  productId: string;
  holder: string;
  coverageAtto: string;
  premiumPaidAtto: string;
  startsAt: string;
  expiresAt: string;
  state: PolicyState;
  claimCount: string;
}

export interface AdjudicationRound {
  verdict: Verdict;
  loss_bps: number;
  controlling_clause: string;
  reasoning: string;
  appeal_round: number;
}

export interface Claim {
  id: string;
  policyId: string;
  claimant: string;
  evidenceUrls: string[];
  chainTxHashes: string[];
  filingBondAtto: string;
  chainFactsJson: string;
  rounds: AdjudicationRound[];
  verdict: Verdict;
  lossBps: string;
  payoutAtto: string;
  state: ClaimState;
  appealBondAtto: string;
  appellant: string;
  appealCount: string;
  filedAt: string;
  adjudicatedAt: string;
}

export interface Stats {
  products: string;
  policies: string;
  claims: string;
  capitalAtto: string;
  lockedAtto: string;
  premiumAtto: string;
}

export interface Quote {
  premiumAtto: string;
  coverageAtto: string;
  days: string;
  capacityAtto: string;
  lockedAtto: string;
}
