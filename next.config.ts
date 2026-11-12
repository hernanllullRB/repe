import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base local) usa WebAssembly y archivos propios: no se empaqueta.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Permite abrir el modo desarrollo desde el celular en la misma red wifi.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Las imágenes subidas desde /admin pesan hasta 4 MB.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/yuhonas/free-exercise-db/**" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
