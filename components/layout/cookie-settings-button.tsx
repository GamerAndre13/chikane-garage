"use client";

import { openCookieSettings } from "@/components/cookie-consent";

export function CookieSettingsButton() {
  return <button type="button" onClick={openCookieSettings} className="transition-colors hover:text-white">Preferências de cookies</button>;
}
