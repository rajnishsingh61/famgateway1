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
          find: /^tslib\/modules\/index\.js$/,
          replacement: "tslib/tslib.js",
        },
        {
          find: /^tslib$/,
          replacement: "tslib/tslib.js",
        },
      ],
    },
  },
});
