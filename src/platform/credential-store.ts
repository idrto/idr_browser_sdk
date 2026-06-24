import { CREDENTIAL_STORAGE_KEY } from "../constants";
import type { IdrAuthMode } from "../types";

export type StoredCredential =
  | {
      mode: "account";
      accessToken: string;
      entityId: string;
      expiresAt: number;
      sourceHost: string;
    }
  | {
      mode: "access_key";
      accessToken: string;
      entityId: string;
      expiresAt: number;
      sourceHost: string;
      /** Never exposed via public API — internal only */
      keyHint: string;
    };

function storage(persist: boolean): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return persist ? localStorage : sessionStorage;
}

export function loadCredential(): StoredCredential | null {
  for (const store of [sessionStorage, localStorage]) {
    if (typeof store === "undefined") continue;
    const raw = store.getItem(CREDENTIAL_STORAGE_KEY);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as StoredCredential;
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        store.removeItem(CREDENTIAL_STORAGE_KEY);
        continue;
      }
      return parsed;
    } catch {
      store.removeItem(CREDENTIAL_STORAGE_KEY);
    }
  }
  return null;
}

export function saveCredential(cred: StoredCredential, persist: boolean): void {
  const store = storage(persist);
  if (!store) return;
  store.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(cred));
  const other = persist ? sessionStorage : localStorage;
  other.removeItem(CREDENTIAL_STORAGE_KEY);
}

export function clearCredential(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  }
}

export function authModeFromCredential(cred: StoredCredential | null): IdrAuthMode {
  if (!cred) return "none";
  return cred.mode;
}

export function accessTokenFromCredential(cred: StoredCredential | null): string | null {
  return cred?.accessToken ?? null;
}

export function sourceHostFromCredential(cred: StoredCredential | null): string {
  return cred?.sourceHost ?? "browser";
}

export function entityIdFromCredential(cred: StoredCredential | null): string | null {
  return cred?.entityId ?? null;
}

/** Access key prefix hint for UI — never the full secret */
export function keyHint(accessKey: string): string {
  const trimmed = accessKey.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 7)}…`;
}
