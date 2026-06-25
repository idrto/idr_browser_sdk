import { CREDENTIAL_STORAGE_KEY } from "../constants";
import type { HostIdentityDocument, IdrAuthMode } from "../types";

export type StoredCredential = {
  mode: "account";
  accessToken: string;
  entityId: string;
  expiresAt: number;
  sourceHost: string;
  hostIdentity: HostIdentityDocument;
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
      if (!parsed.hostIdentity || parsed.mode !== "account") {
        store.removeItem(CREDENTIAL_STORAGE_KEY);
        continue;
      }
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

export function credentialIsPersisted(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(CREDENTIAL_STORAGE_KEY) !== null;
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

export function hostIdentityFromCredential(cred: StoredCredential | null): HostIdentityDocument | null {
  return cred?.hostIdentity ?? null;
}
