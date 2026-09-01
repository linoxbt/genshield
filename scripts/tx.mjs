import { clientFor } from "./lib.mjs";
const { client } = await clientFor(process.env.KS ?? "verify-depositor");
const tx = await client.getTransaction({ hash: process.argv[2] });
const seen = new Set();
console.log(JSON.stringify(tx, (k, v) => {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string" && v.length > 400) return v.slice(0, 400) + "...[trunc]";
  return v;
}, 2).slice(0, 4000));
