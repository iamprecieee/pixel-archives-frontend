import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "",
          changeOrigin: true,
        },
        "/ws": {
          target: env.VITE_WS_TARGET || "",
          changeOrigin: true,
          ws: true,
        },
      },
      allowedHosts: env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",")
        : [""],
    },
  };
});
