import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },

  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  vite: {
    resolve: {
      alias: [
        {
          find: /^tslib$/,
          replacement: "tslib/tslib.js",
        },
      ],
    },
  },
});
