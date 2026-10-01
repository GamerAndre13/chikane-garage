import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getR2Binding(): Promise<R2Bucket | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.VEHICLE_IMAGES;
  } catch {
    // `next dev` runs outside the Workers runtime. Keep the S3-compatible
    // fallback below so local development continues to work with .env.local.
    return undefined;
  }
}

// Cliente R2 (S3-compatível)
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || "vehicle-images";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket };
}

// Upload de ficheiro para R2
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
  bucket?: string
): Promise<string> {
  const targetBucket = bucket || process.env.R2_BUCKET || "vehicle-images";
  const r2 = await getR2Binding();
  const publicBaseUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!publicBaseUrl) {
    throw new Error("Configure R2_PUBLIC_URL com o domínio público do bucket R2 antes de carregar imagens.");
  }

  if (r2) {
    await r2.put(key, body, { httpMetadata: { contentType } });
  } else {
    const { client, bucket: defaultBucket } = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket || defaultBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await client.send(command);
  }

  // URL pública (assumindo bucket público ou domínio customizado configurado)
  return `${publicBaseUrl}/${key}`;
}

// Delete de ficheiro do R2
export async function deleteFromR2(key: string, bucket?: string): Promise<void> {
  const r2 = await getR2Binding();
  if (r2) {
    await r2.delete(key);
    return;
  }

  const { client, bucket: defaultBucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket || defaultBucket, Key: key }));
}

// Verificar se objeto existe
export async function objectExists(key: string, bucket?: string): Promise<boolean> {
  try {
    const r2 = await getR2Binding();
    if (r2) {
      return Boolean(await r2.head(key));
    }

    const { client, bucket: defaultBucket } = getR2Client();
    await client.send(new HeadObjectCommand({ Bucket: bucket || defaultBucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Gerar URL assinada para upload direto do browser (opcional, para uploads grandes)
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucket?: string
): Promise<string> {
  const { client, bucket: defaultBucket } = getR2Client();
  const targetBucket = bucket || defaultBucket;

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}
