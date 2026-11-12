import { spawn } from "node:child_process";
import { resolve } from "node:path";

const viteCli = resolve("node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, HTTPS: "1" },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Could not start the HTTPS development server: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
