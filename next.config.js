/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/maintenance/assets", destination: "/assets", permanent: false },
      { source: "/maintenance/assets/:path*", destination: "/assets/:path*", permanent: false },
      { source: "/qc/water-test", destination: "/qc/water", permanent: false },
      { source: "/qc/water-test/ledger", destination: "/qc/water/ledger", permanent: false },
      { source: "/qc/raw-water", destination: "/qc/water/raw-water", permanent: false },
      { source: "/qc/raw-water/:path*", destination: "/qc/water/raw-water/:path*", permanent: false },
    ];
  },
};

module.exports = nextConfig;
