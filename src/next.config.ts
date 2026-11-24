import type { NextConfig } from "next";

const config: NextConfig = {
  // Strict mode mounts every screen twice in development, which would start
  // and stop each lesson twice.
  reactStrictMode: false,

  // `npm run dev` only serves the app's scripts to the computer it runs on,
  // unless other hosts are listed here. Without this, a tablet on the same
  // Wi-Fi shows the page but no button responds. These are the private
  // network address ranges, so a tablet can open http://<laptop address>:3000.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default config;
