import { describe, expect, it } from "vitest";

import { MemoryLocalDatabase, type LocalDatabase } from "../../core/data/localDatabase";
import { MemoryKeyValueStore } from "../../core/data/localJsonCollection";
import type { CookbookRecord } from "../../features/cookbooks/data/cookbookMapper";
import type { MealPlanRecord } from "../../features/planner/data/mealPlanMapper";
import type { RecipeComponentRecord } from "../../features/recipe-components/data/recipeComponentMapper";
import type { RecipeRecord } from "../../features/recipes/data/recipeMapper";
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_SCHEMA_VERSION_KEY,
  LOCAL_SCHEMA_VERSION_V1,
  LOCAL_SCHEMA_VERSION_V2,
  LOCAL_SCHEMA_VERSION_V3,
  migrateLocalDataToSchemaV2,
  migrateLocalDataToSchemaV3,
  type LocalDataMigrationSeeds,
} from "./localDataMigration";

const recipe: RecipeRecord = {
  id: "recipe-1",
  title: "Lemon pasta",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [{ name: "Pasta", quantity: 100, unit: "g" }],
  steps: [{ position: 1, text: "Boil pasta." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  difficulty: "beginner",
  isFavorite: false,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const cookbook: CookbookRecord = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [{ id: "category-dinner", name: "Dinner", recipeIds: ["recipe-1"], children: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const plan: MealPlanRecord = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [
    {
      id: "day-training",
      label: "Training Day",
      preset: "training",
      entries: [{ id: "entry-1", recipeId: "recipe-1", servings: 2 }],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const component: RecipeComponentRecord = {
  id: "component-dough",
  name: "Pierogi dough",
  baseServings: 4,
  ingredients: [{ name: "Flour", quantity: 300, unit: "g", group: "Pierogi dough" }],
  steps: [{ position: 1, text: "Knead into a smooth dough." }],
  sourceRecipeId: "recipe-1",
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const seeds: LocalDataMigrationSeeds = {
  recipes: [recipe],
  cookbooks: [cookbook],
  mealPlans: [plan],
  recipeComponents: [component],
};

describe("local data migration", () => {
  it("migrates v1 localStorage records into schema v3 database stores", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();
    storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V1);
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.recipes, JSON.stringify([recipe]));
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks, JSON.stringify([cookbook]));
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans, JSON.stringify([plan]));

    await migrateLocalDataToSchemaV3({ storage, database, seeds });

    await expect(database.list<RecipeRecord>("recipes")).resolves.toEqual([recipe]);
    await expect(database.list<CookbookRecord>("cookbooks")).resolves.toEqual([cookbook]);
    await expect(database.list<MealPlanRecord>("mealPlans")).resolves.toEqual([plan]);
    await expect(database.list<RecipeComponentRecord>("recipeComponents")).resolves.toEqual([
      component,
    ]);
    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V3);
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.recipes)).toBeNull();
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks)).toBeNull();
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans)).toBeNull();
  });

  it("seeds a fresh schema v3 database without writing rich records to localStorage", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();

    await migrateLocalDataToSchemaV3({ storage, database, seeds });

    await expect(database.list<RecipeRecord>("recipes")).resolves.toEqual([recipe]);
    await expect(database.list<CookbookRecord>("cookbooks")).resolves.toEqual([cookbook]);
    await expect(database.list<MealPlanRecord>("mealPlans")).resolves.toEqual([plan]);
    await expect(database.list<RecipeComponentRecord>("recipeComponents")).resolves.toEqual([
      component,
    ]);
    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V3);
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.recipes)).toBeNull();
  });

  it("upgrades schema v2 data by adding the component store without touching existing records", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();
    storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V2);
    await database.put("recipes", { ...recipe, title: "User edited pasta" });

    await migrateLocalDataToSchemaV3({ storage, database, seeds });

    await expect(database.list<RecipeRecord>("recipes")).resolves.toEqual([
      { ...recipe, title: "User edited pasta" },
    ]);
    await expect(database.list<RecipeComponentRecord>("recipeComponents")).resolves.toEqual([
      component,
    ]);
    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V3);
  });

  it("fails safely when legacy records are corrupt", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();
    storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V1);
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.recipes, "{bad-json");
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks, JSON.stringify([cookbook]));
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans, JSON.stringify([plan]));

    await expect(migrateLocalDataToSchemaV3({ storage, database, seeds })).rejects.toMatchObject({
      code: "records-corrupt",
    });

    await expect(database.list<RecipeRecord>("recipes")).resolves.toEqual([]);
    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V1);
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.recipes)).toBe("{bad-json");
  });

  it("keeps v1 localStorage data when database writes fail", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new WriteFailingDatabase();
    storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V1);
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.recipes, JSON.stringify([recipe]));
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks, JSON.stringify([cookbook]));
    storage.setItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans, JSON.stringify([plan]));

    await expect(migrateLocalDataToSchemaV3({ storage, database, seeds })).rejects.toThrow(
      "write failed",
    );

    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V1);
    expect(storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.recipes)).toBe(JSON.stringify([recipe]));
  });

  it("keeps the previous migration export as a compatibility alias", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();

    await migrateLocalDataToSchemaV2({ storage, database, seeds });

    expect(storage.getItem(LOCAL_SCHEMA_VERSION_KEY)).toBe(LOCAL_SCHEMA_VERSION_V3);
  });
});

class WriteFailingDatabase implements LocalDatabase {
  async get() {
    return undefined;
  }

  async list() {
    return [];
  }

  async put() {
    throw new Error("write failed");
  }

  async delete() {}
}
