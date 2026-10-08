import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export interface LocalEvidenceEvent {
  eventId: string;
  workspace: string;
  version: number;
  stateHash: string;
  createdAt: string;
}

function evidenceDirectory(): string {
  const directory = `${config.splDirectory}/evidence`;
  mkdirSync(directory, { recursive: true });
  return directory;
}

function evidenceFile(): string {
  return `${evidenceDirectory()}/events.json`;
}

function readEvents(): LocalEvidenceEvent[] {
  const file = evidenceFile();

  if (!existsSync(file)) {
    return [];
  }

  return JSON.parse(
    readFileSync(file, "utf8")
  ) as LocalEvidenceEvent[];
}

function writeEvents(events: LocalEvidenceEvent[]): void {
  writeFileSync(
    evidenceFile(),
    JSON.stringify(events, null, 2),
    "utf8"
  );
}

export function recordEvidenceEvent(input: {
  eventId?: string;
  version: number;
  stateHash: string;
  createdAt?: string;
}): LocalEvidenceEvent {
  const events = readEvents();

  const existing = events.find(
    (event) =>
      event.workspace === config.workspace &&
      event.version === input.version
  );

  if (existing) {
    if (existing.stateHash !== input.stateHash) {
      throw new Error(
        `Evidence version ${input.version} already exists with a different state hash.`
      );
    }

    return existing;
  }

  const event: LocalEvidenceEvent = {
    eventId: input.eventId ?? `local-${randomUUID()}`,
    workspace: config.workspace,
    version: input.version,
    stateHash: input.stateHash,
    createdAt: input.createdAt ?? new Date().toISOString()
  };

  events.push(event);

  events.sort((a, b) => {
    if (a.workspace !== b.workspace) {
      return a.workspace.localeCompare(b.workspace);
    }

    return a.version - b.version;
  });

  writeEvents(events);

  return event;
}

export function getEvidenceEvents(): LocalEvidenceEvent[] {
  return readEvents();
}

export function getWorkspaceEvidence(): LocalEvidenceEvent[] {
  return readEvents().filter(
    (event) => event.workspace === config.workspace
  );
}
