import { describe, expect, it } from "vitest";

import { MemoryKeyValueStore } from "../../../core/data/localJsonCollection";
import type { CookSession } from "../application/cookSessionUseCases";
import { LocalCookSessionStore } from "./CookSessionStores";

const session: CookSession = {
  recipeId: "recipe-1",
  currentStepPosition: 3,
  completedStepPositions: [1, 2],
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("LocalCookSessionStore", () => {
  it("persists cook sessions across store restarts", async () => {
    const storage = new MemoryKeyValueStore();
    const firstStore = new LocalCookSessionStore(storage);

    await firstStore.save(session);
    const restartedStore = new LocalCookSessionStore(storage);

    await expect(restartedStore.get("recipe-1")).resolves.toEqual(session);
  });
});
