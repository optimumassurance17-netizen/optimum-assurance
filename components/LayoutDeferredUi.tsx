"use client";

import dynamic from "next/dynamic";

export const CookieBanner = dynamic(
  () => import("@/components/CookieBanner").then((m) => ({ default: m.CookieBanner })),
  { ssr: false },
);

export const StickyMobileCta = dynamic(
  () => import("@/components/StickyMobileCta").then((m) => ({ default: m.StickyMobileCta })),
  { ssr: false },
);

export const WhatsAppButton = dynamic(
  () => import("@/components/WhatsAppButton").then((m) => ({ default: m.WhatsAppButton })),
  { ssr: false },
);
