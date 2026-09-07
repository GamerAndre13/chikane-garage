import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages suporta Next.js nativamente com output standalone
  output: "standalone",
  // Imagens: permitir domínios externos (Unsplash, R2 public URL)
  images: {
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
        ],
      },
    ];
  },
};

export default nextConfig;