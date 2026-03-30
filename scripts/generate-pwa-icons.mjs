#!/usr/bin/env node
/**
 * Génère public/icon-192.png et public/icon-512.png (charte bleue #2563eb).
 * Usage: npm run icons:pwa
 */
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")
const fill = "#2563eb"

async function writeIcon(size) {
  const font = Math.round(size * 0.38)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${fill}" rx="${Math.round(size * 0.12)}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-weight="700" font-size="${font}px">O</text>
</svg>`
  const out = join(publicDir, `icon-${size}.png`)
  await sharp(Buffer.from(svg)).png().toFile(out)
  console.log("→", out)
}

await writeIcon(192)
await writeIcon(512)
console.log("\n✅ Icônes PWA générées.\n")
