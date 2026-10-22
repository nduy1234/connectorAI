/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // node:sqlite is a Node built-in; keep webpack from trying to bundle it.
    if (isServer) config.externals.push({ "node:sqlite": "commonjs node:sqlite" });
    return config;
  },
};
export default nextConfig;
