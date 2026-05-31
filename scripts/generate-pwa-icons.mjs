import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const src = join(root, "app", "icon.png");
const iconsDir = join(root, "public", "icons");

const targets = [
  "icon-192-any.png",
  "icon-192-maskable.png",
  "icon-512-any.png",
  "icon-512-maskable.png",
];

if (!existsSync(src)) {
  console.error("Missing app/icon.png — cannot generate PWA icons.");
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

for (const name of targets) {
  copyFileSync(src, join(iconsDir, name));
}

console.log(`Generated ${targets.length} PWA icons in public/icons/`);
