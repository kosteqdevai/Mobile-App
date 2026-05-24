import { err, ok, type Result } from "../../../core/result/Result";

export type CookSession = {
  recipeId: string;
  currentStepPosition: number;
  completedStepPositions: ReadonlyArray<number>;
  updatedAt: string;
};

export type CookSessionError = {
  code: "repository";
  message: string;
  details?: unknown;
};

export type CookSessionStore = {
  get(recipeId: string): Promise<CookSession | undefined>;
  save(session: CookSession): Promise<void>;
  clear(recipeId: string): Promise<void>;
};

export type CookSessionUseCases = {
  loadSession(recipeId: string): Promise<Result<CookSession | undefined, CookSessionError>>;
  saveSession(session: CookSession): Promise<Result<CookSession, CookSessionError>>;
  clearSession(recipeId: string): Promise<Result<void, CookSessionError>>;
};

export function createCookSessionUseCases(store: CookSessionStore): CookSessionUseCases {
  return {
    async loadSession(recipeId) {
      try {
        return ok(await store.get(recipeId));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async saveSession(session) {
      try {
        await store.save(session);
        return ok(session);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async clearSession(recipeId) {
      try {
        await store.clear(recipeId);
        return ok(undefined);
      } catch (error) {
        return err(repositoryError(error));
      }
    },
  };
}

function repositoryError(error: unknown): CookSessionError {
  return {
    code: "repository",
    message: "Cook session storage is unavailable.",
    details: error,
  };
}
