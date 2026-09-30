import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const python = process.platform === "win32" ? path.join(root, ".venv", "Scripts", "python.exe") : path.join(root, ".venv", "bin", "python");
const next = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: [
    { command: `"${python}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`, cwd: root,
      url: "http://127.0.0.1:8000/health", reuseExistingServer: !process.env.CI, timeout: 120000 },
    { command: `"${process.execPath}" "${next}" dev --hostname 127.0.0.1`, cwd: __dirname,
      url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 120000 },
  ],
});
