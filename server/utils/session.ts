import { createHmac, timingSafeEqual } from "node:crypto";
import { serverConfig } from "../config/env";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AnonymousSession {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

const sign = (payload: string) =>
  createHmac("sha256", serverConfig.anonymousSessionSecret).update(payload).digest("base64url");

export function issueAnonymousSession(): { token: string; session: AnonymousSession } {
  const session: AnonymousSession = {
    sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, session };
}

export function verifyAnonymousSession(token: string): AnonymousSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AnonymousSession;
    if (!session.sessionId || !session.expiresAt || session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
