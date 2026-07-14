import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StoredPersona {
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

const filePath = (contactId: string) => path.join(personasDir, `${contactId}.json`);

export const listPersonas = (): StoredPersona[] => {
  ensureDir();
  return readdirSync(personasDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(path.join(personasDir, name), "utf8")) as StoredPersona;
      } catch {
        return null;
      }
    })
    .filter((item): item is StoredPersona => Boolean(item?.contactId));
};

export const getPersona = (contactId: string): StoredPersona | undefined => {
  ensureDir();
  const target = filePath(contactId);
  if (!existsSync(target)) return undefined;
  try {
    return JSON.parse(readFileSync(target, "utf8")) as StoredPersona;
  } catch {
    return undefined;
  }
};

export const savePersona = (input: {
  contactId: string;
  name: string;
  avatar: string;
  status: string;
  persona: string;
}): StoredPersona => {
  ensureDir();
  const record: StoredPersona = {
    contactId: input.contactId,
    name: input.name.trim(),
    avatar: input.avatar.trim(),
    status: input.status.trim() || "在线",
    persona: input.persona.trim(),
    updatedAt: Date.now(),
  };
  writeFileSync(filePath(input.contactId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
};
