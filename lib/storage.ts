import { Client } from "minio";
import { randomUUID } from "crypto";

// MinIO is the self-hosted, S3-compatible replacement for Supabase Storage.
// Runs as its own Dokploy-managed service alongside Postgres.

let client: Client | null = null;

function getClient() {
  if (client) return client;

  const endPoint = process.env.MINIO_ENDPOINT;
  if (!endPoint) throw new Error("MINIO_ENDPOINT is not set");

  // MINIO_ENDPOINT/MINIO_PORT/MINIO_USE_SSL are three separate env vars
  // (see .env.local.example) rather than one combined URL — read them as
  // such. A bare hostname like "localhost" with USE_SSL=false and PORT=9000
  // must resolve to exactly that, not fall back to https/443.
  const port = Number(process.env.MINIO_PORT || 9000);
  const useSSL = process.env.MINIO_USE_SSL === "true";

  client = new Client({
    endPoint: endPoint.replace(/^https?:\/\//, ""),
    port,
    useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || "",
    secretKey: process.env.MINIO_SECRET_KEY || "",
  });
  return client;
}

const BUCKET = process.env.MINIO_BUCKET || "atozee-uploads";

export async function ensureBucket() {
  const c = getClient();
  const exists = await c.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await c.makeBucket(BUCKET);
    // Public-read policy so product images can be displayed directly by
    // URL without generating a presigned GET for every page view. Uploads
    // still require authenticated presigned PUT URLs (see below) — only
    // reads are public.
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${BUCKET}/*`],
        },
      ],
    };
    await c.setBucketPolicy(BUCKET, JSON.stringify(policy)).catch((err) => {
      console.error("Failed to set public bucket policy — set it manually via the MinIO console if uploads succeed but images 403.", err);
    });
  }
}

/** Server-side upload, e.g. from an admin form or webhook. */
export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  await ensureBucket();
  const c = getClient();
  await c.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

/** Presigned PUT URL so the browser can upload directly to MinIO without
 *  routing the file bytes through our own server. */
export async function getPresignedUploadUrl(key: string, expirySeconds = 600) {
  await ensureBucket();
  const c = getClient();
  return c.presignedPutObject(BUCKET, key, expirySeconds);
}

/** Presigned GET URL for private assets (public bucket policy makes this
 *  unnecessary for product images specifically). */
export async function getPresignedDownloadUrl(key: string, expirySeconds = 3600) {
  const c = getClient();
  return c.presignedGetObject(BUCKET, key, expirySeconds);
}

/** Builds a unique object key for an upload, namespaced by purpose and
 *  preserving the original extension for correct content-type sniffing. */
export function buildUploadKey(originalFilename: string, prefix = "products") {
  const ext = originalFilename.includes(".")
    ? originalFilename.split(".").pop()
    : undefined;
  const name = randomUUID();
  return ext ? `${prefix}/${name}.${ext}` : `${prefix}/${name}`;
}

export function publicObjectUrl(key: string) {
  // MINIO_PUBLIC_URL is the externally-reachable base URL for the bucket
  // (e.g. http://localhost:9000/atozee-uploads in dev, or a real domain in
  // production) — prefer it since MINIO_ENDPOINT alone may be an internal
  // Docker network hostname the browser can't resolve.
  const base = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;

  const scheme = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : "";
  return `${scheme}://${process.env.MINIO_ENDPOINT}${port}/${BUCKET}/${key}`;
}
