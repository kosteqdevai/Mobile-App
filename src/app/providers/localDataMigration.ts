import type { KeyValueStore } from "../../core/data/localJsonCollection";
import { LocalPersistenceError } from "../../core/data/localJsonCollection";
import type {
  LocalDatabase,
  LocalDatabaseRecord,
  LocalDatabaseStoreName,
} from "../../core/data/localDatabase";
import type { CookbookRecord } from "../../features/cookbooks/data/cookbookMapper";
import type { MealPlanRecord } from "../../features/planner/data/mealPlanMapper";
import type { RecipeComponentRecord } from "../../features/recipe-components/data/recipeComponentMapper";
import type { RecipeRecord } from "../../features/recipes/data/recipeMapper";

export const LOCAL_SCHEMA_VERSION_KEY = "lacucina:schema-version";
export const LOCAL_SCHEMA_VERSION_V1 = "1";
export const LOCAL_SCHEMA_VERSION_V2 = "2";
export const LOCAL_SCHEMA_VERSION_V3 = "3";

export const LEGACY_LOCAL_STORAGE_KEYS = {
  recipes: "lacucina:recipes",
  cookbooks: "lacucina:cookbooks",
  mealPlans: "lacucina:meal-plans",
} as const;

export type LocalDataMigrationSeeds = {
  recipes: ReadonlyArray<RecipeRecord>;
  cookbooks: ReadonlyArray<CookbookRecord>;
  mealPlans: ReadonlyArray<MealPlanRecord>;
  recipeComponents: ReadonlyArray<RecipeComponentRecord>;
};

export type LocalDataMigrationOptions = {
  storage: KeyValueStore;
  database: LocalDatabase;
  seeds: LocalDataMigrationSeeds;
};

export async function migrateLocalDataToSchemaV3(options: LocalDataMigrationOptions) {
  const currentVersion = options.storage.getItem(LOCAL_SCHEMA_VERSION_KEY);

  if (currentVersion === LOCAL_SCHEMA_VERSION_V3) {
    return;
  }

  if (currentVersion === LOCAL_SCHEMA_VERSION_V2) {
    await migrateStore(options.database, "recipeComponents", options.seeds.recipeComponents);
    options.storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V3);
    return;
  }

  if (currentVersion && currentVersion !== LOCAL_SCHEMA_VERSION_V1) {
    throw new LocalPersistenceError(
      "schema-version-unsupported",
      `Local data schema ${currentVersion} is not supported by schema ${LOCAL_SCHEMA_VERSION_V3}.`,
    );
  }

  const legacyData = readLegacyData(options.storage);
  const hasLegacyCollections =
    options.storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.recipes) !== null ||
    options.storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks) !== null ||
    options.storage.getItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans) !== null;

  await migrateStore(
    options.database,
    "recipes",
    hasLegacyCollections ? legacyData.recipes : options.seeds.recipes,
  );
  await migrateStore(
    options.database,
    "cookbooks",
    hasLegacyCollections ? legacyData.cookbooks : options.seeds.cookbooks,
  );
  await migrateStore(
    options.database,
    "mealPlans",
    hasLegacyCollections ? legacyData.mealPlans : options.seeds.mealPlans,
  );
  await migrateStore(options.database, "recipeComponents", options.seeds.recipeComponents);

  options.storage.setItem(LOCAL_SCHEMA_VERSION_KEY, LOCAL_SCHEMA_VERSION_V3);
  options.storage.removeItem(LEGACY_LOCAL_STORAGE_KEYS.recipes);
  options.storage.removeItem(LEGACY_LOCAL_STORAGE_KEYS.cookbooks);
  options.storage.removeItem(LEGACY_LOCAL_STORAGE_KEYS.mealPlans);
}

export const migrateLocalDataToSchemaV2 = migrateLocalDataToSchemaV3;

function readLegacyData(storage: KeyValueStore): LocalDataMigrationSeeds {
  return {
    recipes: readLegacyCollection<RecipeRecord>(storage, LEGACY_LOCAL_STORAGE_KEYS.recipes),
    cookbooks: readLegacyCollection<CookbookRecord>(storage, LEGACY_LOCAL_STORAGE_KEYS.cookbooks),
    mealPlans: readLegacyCollection<MealPlanRecord>(storage, LEGACY_LOCAL_STORAGE_KEYS.mealPlans),
    recipeComponents: [],
  };
}

function readLegacyCollection<TRecord extends LocalDatabaseRecord>(
  storage: KeyValueStore,
  collectionKey: string,
) {
  const raw = storage.getItem(collectionKey);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || !parsed.every(isRecordWithId)) {
      throw new Error(`Expected ${collectionKey} to contain records with ids.`);
    }

    return parsed.map((record) => structuredClone(record) as TRecord);
  } catch (error) {
    throw new LocalPersistenceError(
      "records-corrupt",
      `Legacy local records in ${collectionKey} could not be migrated safely.`,
      error,
    );
  }
}

async function migrateStore<TRecord extends LocalDatabaseRecord>(
  database: LocalDatabase,
  storeName: LocalDatabaseStoreName,
  records: ReadonlyArray<TRecord>,
) {
  for (const record of records) {
    await database.put(storeName, record);
  }
}

function isRecordWithId(value: unknown): value is LocalDatabaseRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  );
}
