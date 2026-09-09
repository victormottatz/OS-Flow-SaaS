/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * authStorage — Utilitário de persistência de sessão do OS Flow.
 * Garante compatibilidade retroativa e migração suave de tokens e preferências.
 */

const TOKEN_KEY = "osflow_token";
const LEGACY_TOKEN_KEY = "mgv_token";

const USER_KEY = "osflow_user";
const LEGACY_USER_KEY = "mgv_user";

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || "";
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function getSavedUser<T = any>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setSavedUser(user: any): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(user);
  localStorage.setItem(USER_KEY, raw);
  localStorage.setItem(LEGACY_USER_KEY, raw);
}

export function removeSavedUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}
