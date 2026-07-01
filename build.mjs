import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Kept external: ESM-only UI packages, viem, and the native-backed WDK wallet.
const external = [
  "ink",
  "ink-text-input",
  "ink-spinner",
  "react",
  "react/jsx-runtime",
  "viem",
  "viem/*",
  "@tetherto/wdk-wallet-evm",
  "@tetherto/wdk-wallet-solana",
  "@tetherto/wdk-wallet-spark",
  "@solana/addresses",
  "@solana/functional",
  "@solana/instructions",
  "@solana/transaction-messages",
  "bip39",
  "dotenv",
  "dotenv/config",
];

await build({
  entryPoints: ["src/main.tsx"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  jsx: "automatic",
  external,
  alias: {
    "@": resolve(__dirname, "src"),
  },
  // Some bundled CJS deps (e.g. @ethersproject via the Uniswap v3-sdk) call
  // require('crypto'); provide a real require in the ESM output so they work.
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: "info",
});
