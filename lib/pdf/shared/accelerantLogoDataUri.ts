import { existsSync, readFileSync } from "fs"

const LOGO_URL = new URL("../../../public/branding/accelerant-logo.png", import.meta.url)

let cache: string | undefined | null = null

/** Data URI pour `@react-pdf/renderer` `<Image src={…} />` (lecture synchrone, cache module). */
export function getAccelerantLogoDataUriSync(): string | undefined {
  if (cache !== null) return cache
  try {
    if (!existsSync(LOGO_URL)) {
      cache = undefined
      return undefined
    }
    const buf = readFileSync(LOGO_URL)
    cache = `data:image/png;base64,${buf.toString("base64")}`
    return cache
  } catch {
    cache = undefined
    return undefined
  }
}

/** Largeur logo (pt) alignée sur pdf-lib */
export const ACCELERANT_LOGO_WIDTH_PT = 168
