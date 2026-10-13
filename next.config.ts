import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions: por omissão o corpo do pedido está limitado a 1MB, o que
  // fazia falhar o envio de várias fotografias de viatura numa só submissão
  // (as fotos são convertidas no cliente para WebP ~200-500KB cada).
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // Imagens: permitir domínios externos (Unsplash, R2 public URL).
  // unoptimized: o OpenNext/Cloudflare não serve o optimizer de imagens do
  // Next sem um binding/loader próprio — manter as URLs originais evita
  // imagens partidas em produção (o next/image continua a dar width/height).
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
  // Headers de segurança básicos
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;

void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
  initOpenNextCloudflareForDev(),
);
