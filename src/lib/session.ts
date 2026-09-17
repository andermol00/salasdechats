"use client";

import { SETTINGS_KEY, SESSION_KEY } from "./constants";
import { defaultSettings, type Identity, type Settings } from "./types";

export function loadIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (!parsed.userId || !parsed.username || !parsed.color) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
}

export function updateIdentity(patch: Partial<Identity>) {
  const current = loadIdentity();
  if (!current) return;
  saveIdentity({ ...current, ...patch });
}

export function clearRoomFromIdentity() {
  const current = loadIdentity();
  if (!current) return;
  saveIdentity({ ...current, roomCode: null });
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function ensureUserId() {
  const existing = loadIdentity();
  if (existing?.userId) return existing.userId;
  return crypto.randomUUID();
}
