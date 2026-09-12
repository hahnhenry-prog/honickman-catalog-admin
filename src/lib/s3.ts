import { UploadButton } from "../components/inputs";

export const S3_BUCKET = import.meta.env.VITE_AWS_S3_BUCKET as string | undefined;

export const S3_REGION = "us-east-1";

export const S3_ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY_ID as string | undefined;

export const S3_SECRET_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY as string | undefined;

export const S3_ENABLED = !!(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY);


export async function fileToWebP(file: File, maxPx: number, quality: number): Promise<Blob> {
  const isSvg = file.type === "image/svg+xml";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (isSvg) {
    // Load SVG via <img> to rasterize at a fixed size
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || maxPx;
        const h = img.naturalHeight || maxPx;
        // For SVGs, always scale UP to maxPx on the longest side so the
        // rasterized WebP is high-res regardless of the SVG's intrinsic size.
        const scale = maxPx / Math.max(w, h);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  } else {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/webp", quality)
  );
}


export async function s3Put(client: unknown, key: string, body: File | Blob, contentType: string): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const url = await (getSignedUrl as Function)(
    client,
    new PutObjectCommand({ Bucket: S3_BUCKET!, Key: key, ContentType: contentType }),
    { expiresIn: 60 }
  );
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}


export async function uploadToS3(file: File, folder: string, id: string): Promise<{ fullUrl: string; webUrl: string }> {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY!, secretAccessKey: S3_SECRET_KEY! },
  });
  const ext = file.name.split(".").pop() ?? "bin";
  const fullKey = `${folder}/full/${id}.${ext}`;
  const webKey = `${folder}/web/${id}.webp`;
  const webBlob = await fileToWebP(file, 1200, 0.85);
  await Promise.all([
    s3Put(client, fullKey, file, file.type),
    s3Put(client, webKey, webBlob, "image/webp"),
  ]);
  return {
    fullUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fullKey}`,
    webUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${webKey}`,
  };
}

// ─── UploadButton ─────────────────────────────────────────────────────────────

