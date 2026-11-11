import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    '/api/free-khata/reports/export': [
      'src/lib/reports/fonts/**/*',
      'public/pakka-chittha-logo.png',
    ],
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.8:3000',
    '192.168.29.64:3000',
    '127.0.0.1',
    'localhost',
  ],
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
