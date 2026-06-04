import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hsk/shared", "@hsk/db", "@hsk/ui"],
  images: {
    // 现代格式优先,自动协商:AVIF 体积最小,WebP 兜底,原 PNG 最后。
    formats: ["image/avif", "image/webp"],
    // 题图/选项图实际渲染宽度有限(题图 max-w-sm≈384px,选项图 1/3 列≈300px),
    // 收窄候选尺寸避免生成无谓的大图变体。
    deviceSizes: [384, 640, 750, 828, 1080],
    imageSizes: [96, 128, 200, 256, 384],
    // 将来切到 Supabase Storage / 图床时在此放行远端域名。
    remotePatterns: [],
  },
};

export default nextConfig;
