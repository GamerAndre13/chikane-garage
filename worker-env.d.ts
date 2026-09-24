interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  head(key: string): Promise<unknown | null>;
  delete(key: string): Promise<void>;
}

interface CloudflareEnv {
  VEHICLE_IMAGES: R2Bucket;
}
