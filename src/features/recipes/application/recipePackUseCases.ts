import { err, ok, type Result } from "../../../core/result/Result";
import {
  createRecipe,
  type AllergenPresenceStatus,
  type BigNineAllergen,
  type IngredientInput,
  type NutritionUnit,
  type RecipeDietaryMetadata,
  type RecipeInput,
  type RecipeNutritionEstimate,
  type RecipeNutritionValue,
  type WarningVerificationStatus,
} from "../domain/recipe";
import type { RecipeUseCases } from "./recipeUseCases";

export const RECIPE_PACK_FORMAT = "lacucina.recipe-pack";
export const RECIPE_PACK_VERSION = 1;

export type RecipePackExport = {
  fileName: string;
  json: string;
  recipeCount: number;
};

export type RecipePackPreviewRecipe = {
  index: number;
  title: string;
  recipeInput: RecipeInput;
  notices: ReadonlyArray<string>;
};

export type RecipePackInvalidRecipe = {
  index: number;
  title: string;
  errors: ReadonlyArray<string>;
};

export type RecipePackPreview = {
  totalCount: number;
  validRecipes: ReadonlyArray<RecipePackPreviewRecipe>;
  invalidRecipes: ReadonlyArray<RecipePackInvalidRecipe>;
};

export type RecipePackImportResult = {
  importedCount: number;
  skippedCount: number;
  importedTitles: ReadonlyArray<string>;
};

export type RecipePackErrorCode = "invalid-json" | "invalid-pack" | "repository";

export type RecipePackError = {
  code: RecipePackErrorCode;
  message: string;
  details?: unknown;
};

export type RecipePackUseCases = {
  exportRecipePack(): Promise<Result<RecipePackExport, RecipePackError>>;
  previewRecipePack(jsonText: string): Result<RecipePackPreview, RecipePackError>;
  importRecipePack(jsonText: string): Promise<Result<RecipePackImportResult, RecipePackError>>;
  getAiPromptTemplate(): string;
};

type RecipePackOptions = {
  now?: () => Date;
  createId?: (input: { index: number; title: string; now: Date }) => string;
};

type ObjectRecord = Record<string, unknown>;

export function createRecipePackUseCases(
  recipeUseCases: RecipeUseCases,
  options: RecipePackOptions = {},
): RecipePackUseCases {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? createImportedRecipeId;

  return {
    async exportRecipePack() {
      const listResult = await recipeUseCases.listRecipes();

      if (!listResult.ok) {
        return err({
          code: "repository",
          message: "Recipes could not be exported.",
          details: listResult.error,
        });
      }

      const exportedAt = now();
      const pack = {
        format: RECIPE_PACK_FORMAT,
        version: RECIPE_PACK_VERSION,
        exportedAt: exportedAt.toISOString(),
        recipes: listResult.value,
      };

      return ok({
        fileName: `lacucina-recipes-${dateStamp(exportedAt)}.json`,
        json: `${JSON.stringify(pack, null, 2)}\n`,
        recipeCount: listResult.value.length,
      });
    },

    previewRecipePack(jsonText) {
      const parseResult = parseRecipePack(jsonText);

      if (!parseResult.ok) {
        return parseResult;
      }

      const previewedAt = now();
      const validRecipes: RecipePackPreviewRecipe[] = [];
      const invalidRecipes: RecipePackInvalidRecipe[] = [];

      parseResult.value.forEach((recipeRecord, index) => {
        const importRecord = recipeRecordToImport(
          recordValue(recipeRecord),
          index,
          previewedAt,
          createId,
        );
        const recipeResult = createRecipe(importRecord.input);
        const title = importRecord.input.title.trim() || `Recipe ${index + 1}`;

        if (!recipeResult.ok) {
          invalidRecipes.push({
            index,
            title,
            errors: recipeResult.error.map((error) => `${error.path}: ${error.message}`),
          });
          return;
        }

        validRecipes.push({
          index,
          title: recipeResult.value.title,
          recipeInput: {
            ...importRecord.input,
            title: recipeResult.value.title,
            description: recipeResult.value.description,
            ingredients: recipeResult.value.ingredients,
            steps: recipeResult.value.steps,
            categoryPath: recipeResult.value.categoryPath,
            tags: recipeResult.value.tags,
            guidance: recipeResult.value.guidance,
            dietary: recipeResult.value.dietary,
            nutrition: recipeResult.value.nutrition,
            isFavorite: recipeResult.value.isFavorite,
            isTemplate: recipeResult.value.isTemplate,
          },
          notices: importRecord.notices,
        });
      });

      return ok({
        totalCount: parseResult.value.length,
        validRecipes,
        invalidRecipes,
      });
    },

    async importRecipePack(jsonText) {
      const previewResult = this.previewRecipePack(jsonText);

      if (!previewResult.ok) {
        return previewResult;
      }

      const importedTitles: string[] = [];

      for (const recipe of previewResult.value.validRecipes) {
        const createResult = await recipeUseCases.createRecipe(recipe.recipeInput);

        if (!createResult.ok) {
          return err({
            code: createResult.error.code === "repository" ? "repository" : "invalid-pack",
            message: createResult.error.message,
            details: createResult.error.details,
          });
        }

        importedTitles.push(createResult.value.title);
      }

      return ok({
        importedCount: importedTitles.length,
        skippedCount: previewResult.value.invalidRecipes.length,
        importedTitles,
      });
    },

    getAiPromptTemplate() {
      return [
        "Return only valid JSON. Do not wrap it in Markdown.",
        "Create a LaCucina recipe pack using this structure:",
        JSON.stringify(
          {
            format: RECIPE_PACK_FORMAT,
            version: RECIPE_PACK_VERSION,
            recipes: [
              {
                title: "Recipe name",
                description: "Short private note",
                baseServings: 2,
                ingredients: [
                  {
                    name: "Ingredient name",
                    quantity: 100,
                    unit: "g",
                    group: "Main",
                    note: "optional prep note",
                    scaleMode: "linear",
                  },
                ],
                steps: ["First cooking step.", "Second cooking step."],
                categoryPath: ["Dinner"],
                tags: ["quick"],
                prepTimeMinutes: 10,
                cookTimeMinutes: 20,
                difficulty: "beginner",
                isTemplate: false,
                guidance: {
                  prepAhead: "optional",
                  refrigeratorStorage: "optional",
                  freezerStorage: "optional",
                  reheating: "optional",
                  holding: "optional",
                  leftoverUse: "optional",
                },
                dietary: {
                  allergens: [{ allergen: "wheat", status: "contains" }],
                  dietaryTags: [],
                },
                nutrition: {
                  calories: { amount: 500, unit: "kcal" },
                  protein: { amount: 30, unit: "g" },
                  fat: { amount: 20, unit: "g" },
                  carbs: { amount: 45, unit: "g" },
                },
              },
            ],
          },
          null,
          2,
        ),
        "Allowed difficulty values: beginner, intermediate.",
        "Allowed scaleMode values: linear, integer, fixed, toTaste, panDependent.",
        "Allowed allergens: milk, eggs, fish, crustaceanShellfish, treeNuts, peanuts, wheat, soybeans, sesame.",
      ].join("\n\n");
    },
  };
}

function parseRecipePack(jsonText: string): Result<ReadonlyArray<unknown>, RecipePackError> {
  if (jsonText.trim().length === 0) {
    return err({
      code: "invalid-json",
      message: "Paste or choose a LaCucina recipe pack first.",
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return err({
      code: "invalid-json",
      message: "Recipe pack JSON could not be read.",
      details: error,
    });
  }

  if (Array.isArray(parsed)) {
    return ok(parsed);
  }

  if (!isObjectRecord(parsed)) {
    return err({
      code: "invalid-pack",
      message: "Recipe pack must be a JSON object with a recipes array.",
    });
  }

  if (typeof parsed.format === "string" && parsed.format !== RECIPE_PACK_FORMAT) {
    return err({
      code: "invalid-pack",
      message: "This file is not a LaCucina recipe pack.",
    });
  }

  if (typeof parsed.version === "number" && parsed.version > RECIPE_PACK_VERSION) {
    return err({
      code: "invalid-pack",
      message: "This recipe pack was created by a newer LaCucina format.",
    });
  }

  if (!Array.isArray(parsed.recipes)) {
    return err({
      code: "invalid-pack",
      message: "Recipe pack must contain a recipes array.",
    });
  }

  return ok(parsed.recipes);
}

function recipeRecordToImport(
  source: ObjectRecord,
  index: number,
  importedAt: Date,
  createId: NonNullable<RecipePackOptions["createId"]>,
): { input: RecipeInput; notices: ReadonlyArray<string> } {
  const title = stringValue(source.title);
  const date = importedAt.toISOString();
  const ingredients = arrayValue(source.ingredients).map(toIngredientImport);
  const input: RecipeInput = {
    id: createId({ index, title, now: importedAt }),
    title,
    description: stringValue(source.description),
    baseServings: numberValue(source.baseServings),
    ingredients: ingredients.map((ingredient) => ingredient.input),
    steps: arrayValue(source.steps).map(toStepInput),
    cookbookId: stringValue(source.cookbookId) || "cookbook-default",
    categoryPath: stringArrayValue(source.categoryPath),
    tags: stringArrayValue(source.tags),
    prepTimeMinutes: optionalNumberValue(source.prepTimeMinutes),
    cookTimeMinutes: optionalNumberValue(source.cookTimeMinutes),
    difficulty: source.difficulty === "intermediate" ? "intermediate" : "beginner",
    notes: stringValue(source.notes) || undefined,
    guidance: guidanceValue(source.guidance),
    dietary: dietaryValue(source.dietary),
    nutrition: nutritionValue(source.nutrition),
    isFavorite: booleanValue(source.isFavorite),
    isTemplate: booleanValue(source.isTemplate),
    createdAt: date,
    updatedAt: date,
  };

  return {
    input,
    notices: ingredients.flatMap((ingredient) => ingredient.notices),
  };
}

function recordValue(value: unknown): ObjectRecord {
  return isObjectRecord(value) ? value : {};
}

function toIngredientImport(value: unknown): {
  input: IngredientInput;
  notices: ReadonlyArray<string>;
} {
  const ingredient = isObjectRecord(value) ? value : {};
  const scaleMode = scaleModeValue(ingredient.scaleMode);
  const name = stringValue(ingredient.name);
  const note = stringValue(ingredient.note);
  const unit = stringValue(ingredient.unit);
  const quantity = numberValue(ingredient.quantity);
  const shouldTreatAsToTaste =
    scaleMode === "toTaste" ||
    containsToTasteCue(note) ||
    containsToTasteCue(unit) ||
    containsToTasteCue(name);

  if (
    (!Number.isFinite(quantity) || quantity <= 0 || unit.trim().length === 0) &&
    shouldTreatAsToTaste
  ) {
    return {
      input: {
        name,
        quantity: 1,
        unit: unit.trim() || "to taste",
        note: note || undefined,
        group: stringValue(ingredient.group) || undefined,
        scaleMode: "toTaste",
      },
      notices: [
        `${name || "Ingredient"} was imported as "to taste" because quantity or unit was missing.`,
      ],
    };
  }

  return {
    input: {
      name,
      quantity,
      unit,
      note: note || undefined,
      group: stringValue(ingredient.group) || undefined,
      scaleMode,
    },
    notices: [],
  };
}

function scaleModeValue(value: unknown): IngredientInput["scaleMode"] {
  return value === "integer" || value === "fixed" || value === "toTaste" || value === "panDependent"
    ? value
    : "linear";
}

function containsToTasteCue(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  return (
    normalizedValue.includes("to taste") ||
    normalizedValue.includes("do smaku") ||
    normalizedValue.includes("as needed") ||
    normalizedValue.includes("wedlug uznania") ||
    normalizedValue.includes("według uznania")
  );
}

function toStepInput(value: unknown, index: number) {
  if (typeof value === "string") {
    return {
      position: index + 1,
      text: value,
    };
  }

  const step = isObjectRecord(value) ? value : {};

  return {
    position: Number.isInteger(step.position) ? Number(step.position) : index + 1,
    text: stringValue(step.text),
  };
}

function guidanceValue(value: unknown) {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    prepAhead: stringValue(value.prepAhead) || undefined,
    refrigeratorStorage: stringValue(value.refrigeratorStorage) || undefined,
    freezerStorage: stringValue(value.freezerStorage) || undefined,
    reheating: stringValue(value.reheating) || undefined,
    holding: stringValue(value.holding) || undefined,
    leftoverUse: stringValue(value.leftoverUse) || undefined,
  };
}

function dietaryValue(value: unknown): RecipeDietaryMetadata | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    allergens: arrayValue(value.allergens).flatMap((allergen) => {
      if (!isObjectRecord(allergen) || typeof allergen.allergen !== "string") {
        return [];
      }

      return [
        {
          allergen: allergen.allergen as BigNineAllergen,
          status: allergenPresenceStatusValue(allergen.status),
        },
      ];
    }),
    dietaryTags: arrayValue(value.dietaryTags).flatMap((tag) => {
      if (typeof tag === "string") {
        return [
          {
            label: tag,
            status: "unverified" as const,
          },
        ];
      }

      if (!isObjectRecord(tag) || typeof tag.label !== "string") {
        return [];
      }

      return [
        {
          label: tag.label,
          status: warningVerificationStatusValue(tag.status),
        },
      ];
    }),
  };
}

function nutritionValue(value: unknown): RecipeNutritionEstimate | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    calories: nutritionMetricValue(value.calories, "kcal"),
    protein: nutritionMetricValue(value.protein, "g"),
    fat: nutritionMetricValue(value.fat, "g"),
    carbs: nutritionMetricValue(value.carbs, "g"),
  };
}

function nutritionMetricValue(
  value: unknown,
  unit: Extract<NutritionUnit, "kcal" | "g">,
): RecipeNutritionValue | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      amount: value,
      unit,
    };
  }

  if (!isObjectRecord(value)) {
    return undefined;
  }

  const amount = numberValue(value.amount);

  return Number.isFinite(amount)
    ? {
        amount,
        unit,
      }
    : undefined;
}

function allergenPresenceStatusValue(value: unknown): AllergenPresenceStatus {
  return value === "doesNotContain" || value === "unverified" ? value : "contains";
}

function warningVerificationStatusValue(value: unknown): WarningVerificationStatus {
  return value === "estimated" || value === "userVerified" ? value : "unverified";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number.NaN;
}

function optionalNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown) {
  return value === true;
}

function arrayValue(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function createImportedRecipeId(input: { index: number; title: string; now: Date }) {
  const titleSlug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  const randomSuffix = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

  return `recipe-import-${dateStamp(input.now)}-${input.index + 1}-${titleSlug || "recipe"}-${randomSuffix}`;
}

function dateStamp(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isObjectRecord(value: unknown): value is ObjectRecord {
  return typeof value === "object" && value !== null;
}
