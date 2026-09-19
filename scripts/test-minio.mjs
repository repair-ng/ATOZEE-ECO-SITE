// Standalone diagnostic — run with: node scripts/test-minio.mjs
// Bypasses Next.js entirely so we can see exactly which credentials are
// being used and whether MinIO accepts them, without any of Next's env
// file layering (.env vs .env.local) in the way.

import { readFileSync, existsSync } from "fs";
import { Client } from "minio";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

// Load both files the same way Next.js does — .env first, then .env.local
// overrides it — so what this script sees matches what the app sees.
const envVars = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };

function mask(value) {
  if (!value) return "(empty)";
  if (value.length <= 4) return "*".repeat(value.length);
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

console.log("--- Effective MinIO config (as Next.js would see it) ---");
console.log("MINIO_ENDPOINT:  ", JSON.stringify(envVars.MINIO_ENDPOINT));
console.log("MINIO_PORT:      ", JSON.stringify(envVars.MINIO_PORT));
console.log("MINIO_USE_SSL:   ", JSON.stringify(envVars.MINIO_USE_SSL));
console.log("MINIO_BUCKET:    ", JSON.stringify(envVars.MINIO_BUCKET));
console.log("MINIO_ACCESS_KEY:", mask(envVars.MINIO_ACCESS_KEY), `(length ${envVars.MINIO_ACCESS_KEY?.length ?? 0})`);
console.log("MINIO_SECRET_KEY:", mask(envVars.MINIO_SECRET_KEY), `(length ${envVars.MINIO_SECRET_KEY?.length ?? 0})`);
console.log("");

const client = new Client({
  endPoint: (envVars.MINIO_ENDPOINT || "localhost").replace(/^https?:\/\//, ""),
  port: Number(envVars.MINIO_PORT || 9000),
  useSSL: envVars.MINIO_USE_SSL === "true",
  accessKey: envVars.MINIO_ACCESS_KEY || "",
  secretKey: envVars.MINIO_SECRET_KEY || "",
});

console.log("--- Attempting client.listBuckets() ---");
try {
  const buckets = await client.listBuckets();
  console.log("SUCCESS. Buckets:", buckets.map((b) => b.name));
} catch (err) {
  console.log("FAILED:", err.code || err.message);
  console.log(err);
}
