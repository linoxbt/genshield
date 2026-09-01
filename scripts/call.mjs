import { clientFor } from "./lib.mjs";
const [addr, method, ...rest] = process.argv.slice(2);
const args = rest.map((a) => { try { return JSON.parse(a); } catch { return a; } });
const { client } = await clientFor(process.env.KS ?? "verify-depositor");
try {
  const r = await client.readContract({ address: addr, functionName: method, args });
  console.log(JSON.stringify(r, (k, v) => typeof v === "bigint" ? v.toString() : v, 2));
} catch (e) { console.log("CALL ERROR:", e.message?.slice(0, 500)); }
