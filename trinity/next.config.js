const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Les ~900 images produits (public/products) ne doivent pas être préchargées par le service worker
  publicExcludes: ["!noprecache/**/*", "!products/**/*"],
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  experimental: {
  },
  eslint: {
    // Le lint est géré via `npm run lint` / la CI, pas au build de déploiement
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.openfoodfacts.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.openfoodfacts.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
        port: "",
        pathname: "/**",
      },
    ],
    domains: [
      "static.openfoodfacts.org",
      "image.openfoodfacts.org",
      "images.openfoodfacts.org",
    ],
  },
});

module.exports = nextConfig;
