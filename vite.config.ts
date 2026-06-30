import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const paymasterTarget = env.CDP_PAYMASTER_URL;

  return {
    plugins: [react(), tailwindcss()],
    server: paymasterTarget
      ? {
          proxy: {
            "/api/paymaster": {
              target: paymasterTarget,
              changeOrigin: true,
              rewrite: () => "",
            },
          },
        }
      : undefined,
  };
});
