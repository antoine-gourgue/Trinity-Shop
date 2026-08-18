const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
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
