import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = join(root, "public");
const source = join(publicDir, "paro-logo.png");

/** PWA 아이콘 캐시 무력화 — manifest/sw/layout와 함께 올릴 것 */
export const PWA_ICON_VERSION = "8";

mkdirSync(publicDir, { recursive: true });

if (!existsSync(source)) {
  console.error("Missing public/paro-logo.png — add the Paro mascot image first.");
  process.exit(1);
}

function roundedMaskSvg(size, radiusRatio = 0.22) {
  const radius = Math.round(size * radiusRatio);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`,
  );
}

async function writeAppIcon(outPath, size, radiusRatio = 0.22) {
  const resized = await sharp(source)
    .resize(size, size, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  await sharp(resized)
    .composite([{ input: roundedMaskSvg(size, radiusRatio), blend: "dest-in" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(`Created ${outPath} (${meta.width}x${meta.height}, r~${Math.round(size * radiusRatio)}px)`);
}

async function main() {
  await writeAppIcon(join(publicDir, "icon-192.png"), 192, 0.22);
  await writeAppIcon(join(publicDir, "icon-512.png"), 512, 0.22);
  await writeAppIcon(join(publicDir, "apple-touch-icon.png"), 180, 0.22);
  await writeAppIcon(join(publicDir, "apple-icon.png"), 180, 0.22);
  await writeAppIcon(join(root, "app", "icon.png"), 32, 0.18);
  await writeAppIcon(join(publicDir, "icon.png"), 512, 0.22);
  await writeAppIcon(join(publicDir, "logo.png"), 512, 0.22);

  console.log(`PWA icon assets ready (v${PWA_ICON_VERSION}, rounded corners).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
