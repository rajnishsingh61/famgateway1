// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Vercel uses Nitro's Vercel output instead of Lovable's default Cloudflare target.
// Without this, the deployment can build but the SSR server is not served correctly.
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_URL);

export default defineConfig({
  nitro: isVercel ? { preset: "vercel" } : true,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // @peculiar/x509 (pulled in by @simplewebauthn/server) does `import tslib from "tslib"`
        // and destructures helpers off the default export. tslib's ESM build has no default
        // export, so the Worker bundle crashed at module init and every SSR page returned 500.
        // Force the CommonJS build so interop provides a real default export.
        { find: /^tslib$/, replacement: "tslib/tslib.js" },
      ],
    },
  },
});
