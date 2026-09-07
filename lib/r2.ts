import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  const { client, bucket: defaultBucket } = getR2Client();
  const targetBucket = bucket || defaultBucket;

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: body as any,
    ContentType: contentType,
  });

  await client.send(command);

  // URL pública (assumindo bucket público ou domínio customizado configurado)
  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${targetBucket}/${key}`;

  return publicUrl;
}

// Delete de ficheiro do R2
export async function deleteFromR2(key: string, bucket?: string): Promise<void> {
  const { client, bucket: defaultBucket } = getR2Client();
  const targetBucket = bucket || defaultBucket;

  const command = new DeleteObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });

  await client.send(command);
}

// Verificar se objeto existe
export async function objectExists(key: string, bucket?: string): Promise<boolean> {
  const { client, bucket: defaultBucket } = getR2Client();
  const targetBucket = bucket || defaultBucket;

  try {
    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });
    await client.send(command);
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