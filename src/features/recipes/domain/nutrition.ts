import type { NutritionMetric, NutritionUnit, Recipe } from "./recipe";

export type NutritionMetricDefinition = {
  metric: NutritionMetric;
  label: string;
  unit: NutritionUnit;
};

export type NutritionSummaryItem = NutritionMetricDefinition & {
  recipeAmount: number;
  perServingAmount: number;
  plannedAmount?: number;
};

export const nutritionMetricDefinitions: ReadonlyArray<NutritionMetricDefinition> = [
  { metric: "calories", label: "Calories", unit: "kcal" },
  { metric: "protein", label: "Protein", unit: "g" },
  { metric: "fat", label: "Fat", unit: "g" },
  { metric: "carbs", label: "Carbs", unit: "g" },
];

export function getRecipeNutritionSummary(recipe: Recipe): ReadonlyArray<NutritionSummaryItem> {
  if (!recipe.nutrition || recipe.baseServings <= 0) {
    return [];
  }

  return nutritionMetricDefinitions.flatMap((definition) => {
    const value = recipe.nutrition?.[definition.metric];

    if (!value) {
      return [];
    }

    return [
      {
        ...definition,
        recipeAmount: value.amount,
        perServingAmount: value.amount / recipe.baseServings,
      },
    ];
  });
}

export function getPlannedNutritionSummary(
  recipe: Recipe,
  plannedServings: number,
): ReadonlyArray<NutritionSummaryItem> {
  if (!Number.isFinite(plannedServings) || plannedServings <= 0) {
    return [];
  }

  return getRecipeNutritionSummary(recipe).map((item) => ({
    ...item,
    plannedAmount: item.perServingAmount * plannedServings,
  }));
}

export function formatNutritionAmount(amount: number) {
  const roundedAmount = Math.round((amount + Number.EPSILON) * 10) / 10;
  return Number.isInteger(roundedAmount) ? String(roundedAmount) : roundedAmount.toFixed(1);
}
