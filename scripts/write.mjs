import { clientFor, awaitTx, addr } from "./lib.mjs";

const [address, functionName, valueStr, ...rest] = process.argv.slice(2);
const args = rest.map((a) => {
  if (a.startsWith("@")) return addr(a.slice(1));
  try { return JSON.parse(a); } catch { return a; }
});
const { client } = await clientFor(process.env.KS ?? "verify-depositor");
const hash = await client.writeContract({
  address,
  functionName,
  args,
  value: BigInt(valueStr),
});
console.log(`${functionName} tx ${hash}`);
await awaitTx(client, hash, functionName, Number(process.env.MAX_MS ?? 420000));
