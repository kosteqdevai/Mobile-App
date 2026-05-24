import type { KeyValueStore } from "../../../core/data/localJsonCollection";
import type { CookSession, CookSessionStore } from "../application/cookSessionUseCases";

const cookSessionStorageKey = "lacucina:cook-sessions";

export class MemoryCookSessionStore implements CookSessionStore {
  private readonly sessions = new Map<string, CookSession>();

  constructor(initialSessions: ReadonlyArray<CookSession> = []) {
    initialSessions.forEach((session) => this.sessions.set(session.recipeId, session));
  }

  async get(recipeId: string) {
    return this.sessions.get(recipeId);
  }

  async save(session: CookSession) {
    this.sessions.set(session.recipeId, session);
  }

  async clear(recipeId: string) {
    this.sessions.delete(recipeId);
  }
}

export class LocalCookSessionStore implements CookSessionStore {
  constructor(private readonly storage: KeyValueStore) {}

  async get(recipeId: string) {
    return this.readSessions()[recipeId];
  }

  async save(session: CookSession) {
    this.writeSessions({
      ...this.readSessions(),
      [session.recipeId]: session,
    });
  }

  async clear(recipeId: string) {
    const sessions = this.readSessions();
    delete sessions[recipeId];
    this.writeSessions(sessions);
  }

  private readSessions(): Record<string, CookSession> {
    const raw = this.storage.getItem(cookSessionStorageKey);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Record<string, CookSession>;
  }

  private writeSessions(sessions: Record<string, CookSession>) {
    this.storage.setItem(cookSessionStorageKey, JSON.stringify(sessions));
  }
}
