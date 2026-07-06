import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  disable: process.env.NODE_ENV === 'development',
});

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/:slug/ic-transfer-branch',
        destination: '/:slug/ic-transfer',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/purchase',
        destination: '/:slug/ic-transfer-admin/purchase',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/sales',
        destination: '/:slug/ic-transfer-admin/sales',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/warehouse',
        destination: '/:slug/ic-transfer-admin/warehouse',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/warehouse/:id',
        destination: '/:slug/ic-transfer-admin/warehouse/:id',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/regions',
        destination: '/:slug/ic-transfer-admin/regions',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/transactions',
        destination: '/:slug/ic-transfer-admin/transactions',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/settings/:path*',
        destination: '/:slug/ic-transfer-admin/settings/:path*',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/finance',
        destination: '/:slug/ic-transfer-admin/finance',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/metal',
        destination: '/:slug/ic-transfer-admin/metal',
        permanent: true,
      },
      {
        source: '/:slug/ic-transfer/non-stock-deals',
        destination: '/:slug/ic-transfer-admin/non-stock-deals',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSerwist(nextConfig);

// Trigger server restart

// Trigger server restart after successful deletion of [id]
