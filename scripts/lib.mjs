// Shared helpers for driving the deployed contract on Studio Network.
//
// Keystores are decrypted in memory only. The raw private key is never
// written to disk and never printed - pass the password via GENSHIELD_PW.
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { Wallet } from "ethers";
import { CalldataAddress } from "genlayer-js/types";
import fs from "fs";

const KEYSTORE_DIR = "/root/.genlayer/keystores";

export async function clientFor(keystoreName) {
  const pw = process.env.GENSHIELD_PW;
  if (!pw) throw new Error("set GENSHIELD_PW");
  const json = fs.readFileSync(`${KEYSTORE_DIR}/${keystoreName}.json`, "utf8");
  const wallet = await Wallet.fromEncryptedJson(json, pw);
  const account = createAccount(wallet.privateKey);
  return { client: createClient({ chain: studionet, account }), address: account.address };
}

export function readContract() {
  return fs.readFileSync("/root/genshield/contracts/genshield.py");
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll a transaction to a terminal state. genlayer-js's own receipt helper
// times out well before an LLM consensus round finishes.
export async function awaitTx(client, hash, label = "tx", maxMs = 300000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < maxMs) {
    const tx = await client.getTransaction({ hash });
    last = tx;
    const s = Number(tx.status ?? tx.statusName ?? -1);
    const name = tx.statusName ?? tx.status_name ?? String(s);
    if (name === "FINALIZED" || name === "ACCEPTED" || s === 5 || s === 7) {
      const res = tx.txExecutionResultName ?? tx.tx_execution_result_name ?? "?";
      console.log(`${label}: ${name} / ${res}`);
      if (String(res).includes("ERROR")) {
        console.log("  err:", JSON.stringify(tx.consensusData ?? tx.consensus_data ?? {}).slice(0, 600));
      }
      return tx;
    }
    if (name === "UNDETERMINED" || s === 6) {
      console.log(`${label}: UNDETERMINED`);
      return tx;
    }
    await sleep(4000);
  }
  console.log(`${label}: timed out, last status`, last?.statusName ?? last?.status);
  return last;
}

// A bare JS string encodes as calldata `str`. A contract param declared
// `Address` needs an explicit CalldataAddress or the constructor/method
// silently fails during decode while the transaction still reports ACCEPTED.
export function addr(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new CalldataAddress(bytes);
}
