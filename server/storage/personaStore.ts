import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StoredPersonaProfile {
  contactId: string;
  name: string;
  avatar: string;
  status: string;
  persona: string;
  updatedAt: number;
}

const personasDir = path.resolve(process.cwd(), "personas");

const ensureDir = () => {
  if (!existsSync(personasDir)) mkdirSync(personasDir, { recursive: true });
};

const filePathFor = (contactId: string) => {
  const safe = contactId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new Error("INVALID_CONTACT_ID");
  return path.join(personasDir, `${safe}.json`);
};

export const listPersonaProfiles = (): StoredPersonaProfile[] => {
  ensureDir();
  return readdirSync(personasDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        const raw = readFileSync(path.join(personasDir, name), "utf8");
        return JSON.parse(raw) as StoredPersonaProfile;
      } catch {
        return null;
      }
    })
    .filter((item): item is StoredPersonaProfile => Boolean(item?.contactId));
};

export const readPersonaProfile = (contactId: string): StoredPersonaProfile | null => {
  ensureDir();
  const file = filePathFor(contactId);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoredPersonaProfile;
  } catch {
    return null;
  }
};

export const writePersonaProfile = (input: {
  contactId: string;
  name: string;
  avatar: string;
  status: string;
  persona: string;
}): StoredPersonaProfile => {
  ensureDir();
  const profile: StoredPersonaProfile = {
    contactId: input.contactId,
    name: input.name.trim(),
    avatar: input.avatar.trim(),
    status: input.status.trim() || "在线",
    persona: input.persona.trim(),
    updatedAt: Date.now(),
  };
  writeFileSync(filePathFor(input.contactId), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  return profile;
};

export const getPersonasDir = () => personasDir;
