/**
 * Bulk product image uploader
 *
 * Replicates the app's single-upload pipeline:
 *   1. Uploads the original file  → s3://BUCKET/products/full/{id}.{ext}
 *   2. Converts to WebP via sharp  → s3://BUCKET/products/web/{id}.webp
 *   3. Updates image_full_url and image_web_url in Supabase
 *
 * Usage:
 *   node scripts/bulk-upload-images.mjs ./path/to/images
 *
 * Required env vars (can also be in a .env file in the project root):
 *   VITE_AWS_ACCESS_KEY_ID
 *   VITE_AWS_SECRET_ACCESS_KEY
 *   VITE_AWS_S3_BUCKET
 *   SUPABASE_SERVICE_ROLE_KEY   ← use the service role key, not the anon key
 *
 * Image files must be named {productId}.{ext}, e.g. 10042.jpg
 *
 * Install dependencies before first run:
 *   pnpm add -D sharp @aws-sdk/client-s3 @supabase/supabase-js dotenv
 */

import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config(); // load .env from cwd

// ─── Config ──────────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.VITE_AWS_S3_BUCKET;
const S3_REGION = "us-east-1";
const ACCESS_KEY = process.env.VITE_AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.VITE_AWS_SECRET_ACCESS_KEY;
const SUPABASE_URL = "https://pzuhltmamzdlqxjjkrov.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WEBP_MAX_PX = 1200;
const WEBP_QUALITY = 85; // matches app's 0.85

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".tiff", ".svg"]);

// ─── Validation ───────────────────────────────────────────────────────────────

const imageDir = process.argv[2];
if (!imageDir) {
  console.error("Usage: node scripts/bulk-upload-images.mjs ./path/to/images");
  process.exit(1);
}
if (!fs.existsSync(imageDir)) {
  console.error(`Directory not found: ${imageDir}`);
  process.exit(1);
}
if (!S3_BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Missing S3 env vars. Set VITE_AWS_S3_BUCKET, VITE_AWS_ACCESS_KEY_ID, VITE_AWS_SECRET_ACCESS_KEY.");
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: S3_REGION,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function s3Url(key) {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

async function uploadBuffer(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

async function processImage(filePath, productId) {
  const ext = path.extname(filePath).toLowerCase();
  const originalBuffer = fs.readFileSync(filePath);

  const fullKey = `products/full/${productId}${ext}`;
  const webKey = `products/web/${productId}.webp`;

  // Detect MIME type for the original
  const mimeMap = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
    ".tiff": "image/tiff", ".svg": "image/svg+xml",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";

  // Convert to WebP via sharp (SVG gets rasterized automatically)
  const webpBuffer = await sharp(originalBuffer)
    .resize(WEBP_MAX_PX, WEBP_MAX_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Upload both in parallel
  await Promise.all([
    uploadBuffer(fullKey, originalBuffer, contentType),
    uploadBuffer(webKey, webpBuffer, "image/webp"),
  ]);

  return { fullUrl: s3Url(fullKey), webUrl: s3Url(webKey) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(imageDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTS.has(ext);
  });

  if (files.length === 0) {
    console.log("No supported image files found in", imageDir);
    process.exit(0);
  }

  console.log(`Found ${files.length} images. Starting upload...\n`);

  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (const file of files) {
    const ext = path.extname(file);
    const productId = path.basename(file, ext);
    const filePath = path.join(imageDir, file);

    process.stdout.write(`  ${file} → `);

    try {
      const { fullUrl, webUrl } = await processImage(filePath, productId);

      const { error } = await supabase
        .from("products")
        .update({ image_full_url: fullUrl, image_web_url: webUrl })
        .eq("id", productId);

      if (error) throw new Error(`Supabase: ${error.message}`);

      console.log("✓");
      succeeded++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      errors.push({ file, error: err.message });
      failed++;
    }
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);

  if (errors.length > 0) {
    console.log("\nFailed files:");
    for (const { file, error } of errors) {
      console.log(`  ${file}: ${error}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
