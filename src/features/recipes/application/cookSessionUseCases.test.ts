import { describe, expect, it } from "vitest";

import { createCookSessionUseCases, type CookSession } from "./cookSessionUseCases";
import { MemoryCookSessionStore } from "../data/CookSessionStores";

const session: CookSession = {
  recipeId: "recipe-1",
  currentStepPosition: 2,
  completedStepPositions: [1],
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("cook session use cases", () => {
  it("saves, loads, and clears a resumable cook session", async () => {
    const useCases = createCookSessionUseCases(new MemoryCookSessionStore());

    await expect(useCases.saveSession(session)).resolves.toEqual({ ok: true, value: session });
    await expect(useCases.loadSession("recipe-1")).resolves.toEqual({
      ok: true,
      value: session,
    });
    await expect(useCases.clearSession("recipe-1")).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(useCases.loadSession("recipe-1")).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });
});
