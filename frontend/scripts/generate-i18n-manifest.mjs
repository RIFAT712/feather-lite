#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const i18nDir = path.resolve(__dirname, "../src/i18n");
const manifestPath = path.resolve(i18nDir, "manifest.generated.json");

function getLanguageName(code) {
  try {
    const dn = new Intl.DisplayNames([code], { type: "language" });
    const name = dn.of(code);
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {
    // Fall back to code
  }
  return code;
}

const files = fs.readdirSync(i18nDir);
const langCodes = [];

for (const file of files) {
  if (!file.endsWith(".json")) continue;
  if (file === "qqq.json" || file === "manifest.generated.json") continue;
  const code = path.basename(file, ".json");
  langCodes.push(code);
}

const entries = langCodes.map((code) => ({
  code,
  name: getLanguageName(code),
}));

// Ensure 'en' is first as default/canonical base language, then sort others alphabetically by code
entries.sort((a, b) => {
  if (a.code === "en") return -1;
  if (b.code === "en") return 1;
  return a.code.localeCompare(b.code);
});

const newContent = JSON.stringify(entries, null, 2) + "\n";
if (fs.existsSync(manifestPath)) {
  const currentContent = fs.readFileSync(manifestPath, "utf8");
  if (currentContent === newContent) {
    console.log(`[i18n-manifest] Manifest already up-to-date with ${entries.length} languages: ${entries.map((e) => e.code).join(", ")}`);
    process.exit(0);
  }
}

fs.writeFileSync(manifestPath, newContent, "utf8");
console.log(`[i18n-manifest] Generated manifest with ${entries.length} languages: ${entries.map((e) => e.code).join(", ")}`);
