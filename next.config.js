/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // small runtime image for the Dokploy Docker build
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Plain http is allowed too, not just for localhost. Production MinIO
      // here is reachable over http://<vps-ip>:9000 with no domain/TLS, and
      // relying on an env var read inside next.config.js to build a
      // hostname-specific pattern is fragile — it only works if Dokploy
      // passes environment variables into the Docker *build* stage
      // specifically, not just the running container, which varies by
      // platform/config. The only images ever rendered in this app come
      // from admin-uploaded product photos (via the authenticated
      // /admin/products flow) — never from arbitrary user input — so
      // allowing any http host here doesn't open this up to abuse the way
      // it would if visitors could submit their own image URLs.
      { protocol: "http", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
