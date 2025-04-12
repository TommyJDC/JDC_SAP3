import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      // Explicitly tell Remix where the app directory is
      appDirectory: "app", 
    }),
    tsconfigPaths(),
  ],
   optimizeDeps: {
    include: ['leaflet'],
  },
   ssr: {
    // noExternal: ['leaflet'], // Uncomment if Leaflet causes SSR issues
  },
});
