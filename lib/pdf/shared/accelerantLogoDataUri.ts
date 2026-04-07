import { existsSync, readFileSync } from "fs"
import path from "path"

const LOGO_PATH_SEGMENTS = ["public", "branding", "accelerant-logo.png"] as const

let cache: string | undefined | null = null

/** Data URI pour `@react-pdf/renderer` `<Image src={…} />` (lecture synchrone, cache module). */
export function getAccelerantLogoDataUriSync(): string | undefined {
  if (cache !== null) return cache
  try {
    const fp = path.join(process.cwd(), ...LOGO_PATH_SEGMENTS)
    if (!existsSync(fp)) {
      cache = undefined
      return undefined
    }
    const buf = readFileSync(fp)
    cache = `data:image/png;base64,${buf.toString("base64")}`
    return cache
  } catch {
    cache = undefined
    return undefined
  }
}

/** Largeur logo (pt) alignée sur pdf-lib */
export const ACCELERANT_LOGO_WIDTH_PT = 168
