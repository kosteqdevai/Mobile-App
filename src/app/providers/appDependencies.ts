import { appConfig } from "../../core/config/appConfig";
import {
  BrowserIndexedDbDatabase,
  MigratingLocalDatabase,
  type LocalDatabase,
} from "../../core/data/localDatabase";
import type { KeyValueStore } from "../../core/data/localJsonCollection";
import {
  createCookbookUseCases,
  type CookbookUseCases,
} from "../../features/cookbooks/application/cookbookUseCases";
import type { CookbookRepository } from "../../features/cookbooks/application/CookbookRepository";
import { IndexedDbCookbookRepository } from "../../features/cookbooks/data/IndexedDbCookbookRepository";
import { InMemoryCookbookRepository } from "../../features/cookbooks/data/InMemoryCookbookRepository";
import { cookbookToRecord } from "../../features/cookbooks/data/cookbookMapper";
import type { Cookbook } from "../../features/cookbooks/domain/cookbook";
import {
  createMealPlanUseCases,
  type MealPlanUseCases,
} from "../../features/planner/application/mealPlanUseCases";
import type { MealPlanRepository } from "../../features/planner/application/MealPlanRepository";
import { IndexedDbMealPlanRepository } from "../../features/planner/data/IndexedDbMealPlanRepository";
import { InMemoryMealPlanRepository } from "../../features/planner/data/InMemoryMealPlanRepository";
import { mealPlanToRecord } from "../../features/planner/data/mealPlanMapper";
import type { MealPlan } from "../../features/planner/domain/mealPlan";
import {
  createRecipeUseCases,
  type RecipeUseCases,
} from "../../features/recipes/application/recipeUseCases";
import {
  createCookSessionUseCases,
  type CookSessionStore,
  type CookSessionUseCases,
} from "../../features/recipes/application/cookSessionUseCases";
import {
  LocalCookSessionStore,
  MemoryCookSessionStore,
} from "../../features/recipes/data/CookSessionStores";
import {
  createMemoryRecipeSharePort,
  createRecipeExportUseCases,
  type RecipeExportUseCases,
  type RecipeSharePort,
} from "../../features/recipes/application/recipeExportUseCases";
import type { RecipeRepository } from "../../features/recipes/application/RecipeRepository";
import { IndexedDbRecipeRepository } from "../../features/recipes/data/IndexedDbRecipeRepository";
import { InMemoryRecipeRepository } from "../../features/recipes/data/InMemoryRecipeRepository";
import { recipeToRecord } from "../../features/recipes/data/recipeMapper";
import { WebRecipeSharePort } from "../../features/recipes/data/WebRecipeSharePort";
import type { Recipe } from "../../features/recipes/domain/recipe";
import { migrateLocalDataToSchemaV2 } from "./localDataMigration";

export type AppDependencies = {
  appConfig: typeof appConfig;
  recipeUseCases: RecipeUseCases;
  recipeExportUseCases: RecipeExportUseCases;
  cookSessionUseCases: CookSessionUseCases;
  cookbookUseCases: CookbookUseCases;
  mealPlanUseCases: MealPlanUseCases;
};

const seedRecipe: Recipe = {
  id: "recipe-seed-rice",
  title: "Tomato rice",
  description: "A quick pantry dinner for scaling tests.",
  baseServings: 2,
  ingredients: [{ name: "Rice", quantity: 200, unit: "g" }],
  steps: [{ position: 1, text: "Cook rice with tomato sauce." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner", "Quick meals"],
  tags: ["quick", "dinner"],
  prepTimeMinutes: 5,
  cookTimeMinutes: 20,
  difficulty: "beginner",
  notes: "Use leftover sauce if you have it.",
  isFavorite: true,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const seedCookbook: Cookbook = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [
    {
      id: "category-dinner",
      name: "Dinner",
      recipeIds: [],
      children: [
        {
          id: "category-quick",
          name: "Quick meals",
          recipeIds: ["recipe-seed-rice"],
          children: [],
        },
      ],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const seedPlan: MealPlan = {
  id: "plan-default",
  name: "Training loop",
  loopDays: [
    {
      id: "day-training",
      label: "Training Day",
      preset: "training",
      entries: [{ id: "entry-rice", recipeId: "recipe-seed-rice", servings: 2 }],
    },
    {
      id: "day-rest",
      label: "Non-training Day",
      preset: "nonTraining",
      entries: [],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

export function createDefaultAppDependencies(): AppDependencies {
  const recipeRepository = new InMemoryRecipeRepository([seedRecipe]);
  const cookSessionStore = new MemoryCookSessionStore();
  const cookbookRepository = new InMemoryCookbookRepository([seedCookbook]);
  const mealPlanRepository = new InMemoryMealPlanRepository([seedPlan]);

  return createAppDependencies(
    recipeRepository,
    cookSessionStore,
    cookbookRepository,
    mealPlanRepository,
    createMemoryRecipeSharePort(),
  );
}

export function createBrowserAppDependencies(
  storage: KeyValueStore,
  database: LocalDatabase = new BrowserIndexedDbDatabase(),
): AppDependencies {
  const migratingDatabase = new MigratingLocalDatabase(database, () =>
    migrateLocalDataToSchemaV2({
      storage,
      database,
      seeds: {
        recipes: [recipeToRecord(seedRecipe)],
        cookbooks: [cookbookToRecord(seedCookbook)],
        mealPlans: [mealPlanToRecord(seedPlan)],
      },
    }),
  );

  const recipeRepository = new IndexedDbRecipeRepository(migratingDatabase);
  const cookSessionStore = new LocalCookSessionStore(storage);
  const cookbookRepository = new IndexedDbCookbookRepository(migratingDatabase);
  const mealPlanRepository = new IndexedDbMealPlanRepository(migratingDatabase);

  return createAppDependencies(
    recipeRepository,
    cookSessionStore,
    cookbookRepository,
    mealPlanRepository,
    new WebRecipeSharePort(window.navigator),
  );
}

function createAppDependencies(
  recipeRepository: RecipeRepository,
  cookSessionStore: CookSessionStore,
  cookbookRepository: CookbookRepository,
  mealPlanRepository: MealPlanRepository,
  recipeSharePort: RecipeSharePort,
): AppDependencies {
  const recipeUseCases = createRecipeUseCases(recipeRepository);

  return {
    appConfig,
    recipeUseCases,
    recipeExportUseCases: createRecipeExportUseCases(recipeUseCases, recipeSharePort),
    cookSessionUseCases: createCookSessionUseCases(cookSessionStore),
    cookbookUseCases: createCookbookUseCases(cookbookRepository),
    mealPlanUseCases: createMealPlanUseCases(mealPlanRepository, recipeRepository),
  };
}

export const defaultAppDependencies: AppDependencies = {
  ...createDefaultAppDependencies(),
};
