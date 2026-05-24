import { err, ok, type Result } from "../../../core/result/Result";
import { formatScaledQuantity } from "../domain/portionScaling";
import type { Recipe, RecipePracticalGuidance } from "../domain/recipe";
import type { RecipeUseCases } from "./recipeUseCases";

export type RecipeExportPayload = {
  title: string;
  text: string;
};

export type RecipeSharePort = {
  shareText(payload: RecipeExportPayload): Promise<Result<void, RecipeExportError>>;
};

export type RecipeExportErrorCode = "not-found" | "validation" | "share-unavailable";

export type RecipeExportError = {
  code: RecipeExportErrorCode;
  message: string;
  details?: unknown;
};

export type RecipeExportUseCases = {
  exportRecipeText(
    recipeId: string,
    targetServings: number,
  ): Promise<Result<RecipeExportPayload, RecipeExportError>>;
  shareRecipe(recipeId: string, targetServings: number): Promise<Result<void, RecipeExportError>>;
};

export function createRecipeExportUseCases(
  recipeUseCases: RecipeUseCases,
  sharePort: RecipeSharePort,
): RecipeExportUseCases {
  return {
    async exportRecipeText(recipeId, targetServings) {
      const recipeResult = await recipeUseCases.getRecipeDetails(recipeId);

      if (!recipeResult.ok) {
        return err(mapRecipeError(recipeResult.error));
      }

      const scaledResult = await recipeUseCases.previewPortions(recipeId, targetServings);

      if (!scaledResult.ok) {
        return err(mapRecipeError(scaledResult.error));
      }

      return ok({
        title: recipeResult.value.title,
        text: formatRecipeExport(recipeResult.value, targetServings, scaledResult.value),
      });
    },

    async shareRecipe(recipeId, targetServings) {
      const exportResult = await this.exportRecipeText(recipeId, targetServings);

      if (!exportResult.ok) {
        return exportResult;
      }

      return sharePort.shareText(exportResult.value);
    },
  };
}

export function createMemoryRecipeSharePort(): RecipeSharePort {
  return {
    async shareText() {
      return ok(undefined);
    },
  };
}

function formatRecipeExport(
  recipe: Recipe,
  targetServings: number,
  scaledIngredients: ReadonlyArray<{
    name: string;
    unit: string;
    note?: string;
    group?: string;
    guidance?: string;
    warning?: string;
    originalQuantity: number;
    scaledQuantity: number;
  }>,
) {
  const timeText = formatTimeText(recipe);
  const lines = [
    `${recipe.title}`,
    `Yield: ${targetServings} servings (base ${recipe.baseServings})`,
    ...(timeText ? [`Time: ${timeText}`] : []),
    "",
    "Ingredients:",
    ...formatGroupedIngredients(scaledIngredients),
    "",
    "Steps:",
    ...recipe.steps.map((step) => `${step.position}. ${step.text}`),
  ];

  if (recipe.notes) {
    lines.push("", `Notes: ${recipe.notes}`);
  }

  const guidanceLines = formatGuidanceLines(recipe.guidance);

  if (guidanceLines.length > 0) {
    lines.push("", "Storage and leftovers:", ...guidanceLines);
    lines.push("User-entered guidance. Review freshness and safety before serving.");
  }

  lines.push("", "Private LaCucina text export. No public publishing link was created.");

  return lines.join("\n");
}

function formatTimeText(recipe: Recipe) {
  const prepTime = recipe.prepTimeMinutes ?? 0;
  const cookTime = recipe.cookTimeMinutes ?? 0;
  const totalTime = prepTime + cookTime;
  const parts = [];

  if (prepTime > 0) {
    parts.push(`prep ${prepTime} min`);
  }

  if (cookTime > 0) {
    parts.push(`cook ${cookTime} min`);
  }

  if (totalTime > 0) {
    parts.push(`total ${totalTime} min`);
  }

  return parts.join(", ");
}

function formatGroupedIngredients(
  scaledIngredients: ReadonlyArray<{
    name: string;
    unit: string;
    note?: string;
    group?: string;
    guidance?: string;
    warning?: string;
    originalQuantity: number;
    scaledQuantity: number;
  }>,
) {
  const groups = new Map<string, typeof scaledIngredients>();

  scaledIngredients.forEach((ingredient) => {
    const groupName = ingredient.group?.trim() || "Ingredients";
    groups.set(groupName, [...(groups.get(groupName) ?? []), ingredient]);
  });

  return Array.from(groups.entries()).flatMap(([groupName, ingredients]) => [
    `${groupName}:`,
    ...ingredients.map((ingredient) => {
      const prepNote = ingredient.note ? `, ${ingredient.note}` : "";
      const scalingNote = ingredient.warning ?? ingredient.guidance;
      const scalingText = scalingNote ? `; ${scalingNote}` : "";

      return `- ${formatScaledQuantity(ingredient.scaledQuantity)} ${ingredient.unit} ${
        ingredient.name
      }${prepNote} (base ${formatScaledQuantity(ingredient.originalQuantity)} ${
        ingredient.unit
      })${scalingText}`;
    }),
  ]);
}

function formatGuidanceLines(guidance: RecipePracticalGuidance | undefined) {
  return [
    { label: "Prep ahead", value: guidance?.prepAhead },
    { label: "Refrigerator storage", value: guidance?.refrigeratorStorage },
    { label: "Freezer storage", value: guidance?.freezerStorage },
    { label: "Reheating", value: guidance?.reheating },
    { label: "Holding", value: guidance?.holding },
    { label: "Leftovers", value: guidance?.leftoverUse },
  ]
    .filter((item): item is { label: string; value: string } => Boolean(item.value))
    .map((item) => `- ${item.label}: ${item.value}`);
}

function mapRecipeError(error: {
  code: string;
  message: string;
  details?: unknown;
}): RecipeExportError {
  if (error.code === "not-found") {
    return {
      code: "not-found",
      message: "Recipe was not found.",
      details: error.details,
    };
  }

  return {
    code: "validation",
    message: error.message,
    details: error.details,
  };
}
