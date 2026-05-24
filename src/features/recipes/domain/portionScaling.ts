import { err, ok, type Result } from "../../../core/result/Result";
import type { Ingredient, IngredientScaleMode, Recipe } from "./recipe";

export type ScaledIngredientBehavior = "linear" | "rounded" | "fixed" | "toTaste" | "panDependent";

export type ScaledIngredient = Ingredient & {
  originalQuantity: number;
  scaledQuantity: number;
  scaleMode: IngredientScaleMode;
  scalingBehavior: ScaledIngredientBehavior;
  guidance?: string;
  warning?: string;
};

export type PortionScalingErrorCode =
  | "base-servings-invalid"
  | "target-servings-invalid"
  | "ingredient-quantity-invalid";

export type PortionScalingError = {
  code: PortionScalingErrorCode;
  message: string;
  path: string;
};

export function scaleRecipeIngredients(
  recipe: Recipe,
  targetServings: number,
): Result<ReadonlyArray<ScaledIngredient>, PortionScalingError> {
  if (!isPositiveNumber(recipe.baseServings)) {
    return err({
      code: "base-servings-invalid",
      message: "Base servings must be greater than zero.",
      path: "baseServings",
    });
  }

  if (!isPositiveNumber(targetServings)) {
    return err({
      code: "target-servings-invalid",
      message: "Target servings must be greater than zero.",
      path: "targetServings",
    });
  }

  const scaledIngredients: ScaledIngredient[] = [];

  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const scaledQuantity = scaleQuantity(ingredient.quantity, recipe.baseServings, targetServings);

    if (!scaledQuantity.ok) {
      return err({
        code: scaledQuantity.error.code,
        message: scaledQuantity.error.message,
        path: `ingredients.${index}.quantity`,
      });
    }

    scaledIngredients.push(applyScaleMode(ingredient, ingredient.quantity, scaledQuantity.value));
  }

  return ok(scaledIngredients);
}

export function scaleQuantity(
  originalQuantity: number,
  baseServings: number,
  targetServings: number,
): Result<number, PortionScalingError> {
  if (!isPositiveNumber(originalQuantity)) {
    return err({
      code: "ingredient-quantity-invalid",
      message: "Ingredient quantity must be greater than zero.",
      path: "quantity",
    });
  }

  if (!isPositiveNumber(baseServings)) {
    return err({
      code: "base-servings-invalid",
      message: "Base servings must be greater than zero.",
      path: "baseServings",
    });
  }

  if (!isPositiveNumber(targetServings)) {
    return err({
      code: "target-servings-invalid",
      message: "Target servings must be greater than zero.",
      path: "targetServings",
    });
  }

  return ok((originalQuantity * targetServings) / baseServings);
}

export function roundScaledQuantity(quantity: number, decimalPlaces = 2) {
  const factor = 10 ** decimalPlaces;
  return Math.round((quantity + Number.EPSILON) * factor) / factor;
}

export function formatScaledQuantity(quantity: number) {
  const rounded = roundScaledQuantity(quantity);
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function applyScaleMode(
  ingredient: Ingredient,
  originalQuantity: number,
  linearScaledQuantity: number,
): ScaledIngredient {
  const scaleMode = ingredient.scaleMode ?? "linear";

  if (scaleMode === "integer") {
    return {
      ...ingredient,
      scaleMode,
      scalingBehavior: "rounded",
      originalQuantity,
      scaledQuantity: Math.max(1, Math.round(linearScaledQuantity)),
      guidance: "Rounded to a whole usable unit.",
    };
  }

  if (scaleMode === "fixed") {
    return {
      ...ingredient,
      scaleMode,
      scalingBehavior: "fixed",
      originalQuantity,
      scaledQuantity: originalQuantity,
      guidance: "Kept fixed when servings change.",
    };
  }

  if (scaleMode === "toTaste") {
    return {
      ...ingredient,
      scaleMode,
      scalingBehavior: "toTaste",
      originalQuantity,
      scaledQuantity: linearScaledQuantity,
      guidance: "Start with this estimate, then adjust to taste.",
    };
  }

  if (scaleMode === "panDependent") {
    return {
      ...ingredient,
      scaleMode,
      scalingBehavior: "panDependent",
      originalQuantity,
      scaledQuantity: linearScaledQuantity,
      warning: "Review pan size and cook time when scaling this ingredient.",
    };
  }

  return {
    ...ingredient,
    scaleMode,
    scalingBehavior: "linear",
    originalQuantity,
    scaledQuantity: linearScaledQuantity,
  };
}

function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}
