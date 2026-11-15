import type { NextConfig } from "next";

const config: NextConfig = {
  // Strict mode mounts every screen twice in development, which would start
  // and stop each lesson twice and leave an extra "unfinished" lesson record.
  reactStrictMode: false,
};

export default config;
