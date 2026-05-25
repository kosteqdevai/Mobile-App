import type {
  AllergenPresenceStatus,
  NutritionMetric,
  NutritionUnit,
  Recipe,
  RecipeDietaryMetadata,
  RecipeNutritionEstimate,
} from "../domain/recipe";

export type RecipeRecord = Recipe;

export function recipeToRecord(recipe: Recipe): RecipeRecord {
  return structuredClone(recipe);
}

export function recipeFromRecord(record: RecipeRecord): Recipe {
  const recipe = structuredClone(record) as Recipe & {
    dietary?: unknown;
    nutrition?: unknown;
  };

  return {
    ...recipe,
    dietary: normalizeDietaryRecord(recipe.dietary),
    nutrition: normalizeNutritionRecord(recipe.nutrition),
    isTemplate: recipe.isTemplate === true,
  };
}

function normalizeDietaryRecord(dietary: unknown): RecipeDietaryMetadata | undefined {
  if (!isObjectRecord(dietary)) {
    return undefined;
  }

  const allergens = Array.isArray(dietary.allergens)
    ? dietary.allergens.filter(isObjectRecord).flatMap((flag) =>
        typeof flag.allergen === "string"
          ? [
              {
                allergen: flag.allergen as RecipeDietaryMetadata["allergens"][number]["allergen"],
                status: normalizeAllergenStatus(flag.status),
              },
            ]
          : [],
      )
    : [];
  const dietaryTags = Array.isArray(dietary.dietaryTags)
    ? dietary.dietaryTags.filter(isObjectRecord).flatMap((flag) =>
        typeof flag.label === "string" && typeof flag.status === "string"
          ? [
              {
                label: flag.label,
                status: flag.status as RecipeDietaryMetadata["dietaryTags"][number]["status"],
              },
            ]
          : [],
      )
    : [];

  return allergens.length > 0 || dietaryTags.length > 0 ? { allergens, dietaryTags } : undefined;
}

function normalizeAllergenStatus(status: unknown): AllergenPresenceStatus {
  if (status === "contains" || status === "doesNotContain" || status === "unverified") {
    return status;
  }

  if (status === "estimated" || status === "userVerified") {
    return "contains";
  }

  return "unverified";
}

const nutritionUnitsByMetric: Record<NutritionMetric, NutritionUnit> = {
  calories: "kcal",
  protein: "g",
  fat: "g",
  carbs: "g",
};

const nutritionMetrics: ReadonlyArray<NutritionMetric> = ["calories", "protein", "fat", "carbs"];

function normalizeNutritionRecord(nutrition: unknown): RecipeNutritionEstimate | undefined {
  if (!isObjectRecord(nutrition)) {
    return undefined;
  }

  const estimate: RecipeNutritionEstimate = {};

  nutritionMetrics.forEach((metric) => {
    const value = nutrition[metric];

    if (
      !isObjectRecord(value) ||
      typeof value.amount !== "number" ||
      !Number.isFinite(value.amount)
    ) {
      return;
    }

    estimate[metric] = {
      amount: value.amount,
      unit: nutritionUnitsByMetric[metric],
    };
  });

  return Object.keys(estimate).length > 0 ? estimate : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
