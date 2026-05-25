import { err, ok, type Result } from "../../../core/result/Result";
import type { Ingredient, RecipeStep } from "../../recipes/domain/recipe";

export type RecipeComponent = {
  id: string;
  name: string;
  baseServings: number;
  ingredients: ReadonlyArray<Ingredient>;
  steps: ReadonlyArray<RecipeStep>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  notes?: string;
  sourceRecipeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeComponentInput = {
  id: string;
  name: string;
  baseServings: number;
  ingredients: ReadonlyArray<Ingredient>;
  steps?: ReadonlyArray<RecipeStep>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  notes?: string;
  sourceRecipeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeComponentImportSnapshot = {
  sourceComponentId: string;
  sourceRecipeId?: string;
  name: string;
  ingredients: ReadonlyArray<Ingredient>;
  steps: ReadonlyArray<RecipeStep>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  notes?: string;
};

export type RecipeComponentValidationErrorCode =
  | "component-id-required"
  | "component-name-required"
  | "component-base-servings-invalid"
  | "component-ingredients-required"
  | "component-ingredient-name-required"
  | "component-ingredient-quantity-invalid"
  | "component-ingredient-unit-required"
  | "component-step-invalid"
  | "component-time-invalid"
  | "component-date-required";

export type RecipeComponentValidationError = {
  code: RecipeComponentValidationErrorCode;
  message: string;
  path: string;
};

export function createRecipeComponent(
  input: RecipeComponentInput,
): Result<RecipeComponent, RecipeComponentValidationError[]> {
  const errors = validateRecipeComponentInput(input);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: input.id.trim(),
    name: input.name.trim(),
    baseServings: input.baseServings,
    ingredients: input.ingredients.map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit.trim(),
      note: optionalTrim(ingredient.note),
      group: optionalTrim(ingredient.group),
      scaleMode: ingredient.scaleMode,
    })),
    steps: [...(input.steps ?? [])]
      .sort((firstStep, secondStep) => firstStep.position - secondStep.position)
      .map((step, index) => ({
        position: index + 1,
        text: step.text.trim(),
      })),
    prepTimeMinutes: input.prepTimeMinutes,
    cookTimeMinutes: input.cookTimeMinutes,
    notes: optionalTrim(input.notes),
    sourceRecipeId: optionalTrim(input.sourceRecipeId),
    createdAt: input.createdAt.trim(),
    updatedAt: input.updatedAt.trim(),
  });
}

export function buildRecipeComponentImportSnapshot(
  component: RecipeComponent,
): RecipeComponentImportSnapshot {
  return {
    sourceComponentId: component.id,
    sourceRecipeId: component.sourceRecipeId,
    name: component.name,
    ingredients: component.ingredients.map((ingredient) => ({
      ...ingredient,
      group: ingredient.group?.trim() || component.name,
    })),
    steps: component.steps.map((step, index) => ({
      position: index + 1,
      text: step.text,
    })),
    prepTimeMinutes: component.prepTimeMinutes,
    cookTimeMinutes: component.cookTimeMinutes,
    notes: component.notes,
  };
}

function validateRecipeComponentInput(
  input: RecipeComponentInput,
): RecipeComponentValidationError[] {
  const errors: RecipeComponentValidationError[] = [];

  if (input.id.trim().length === 0) {
    errors.push(validationError("component-id-required", "Component id is required.", "id"));
  }

  if (input.name.trim().length === 0) {
    errors.push(validationError("component-name-required", "Component name is required.", "name"));
  }

  if (!isPositiveNumber(input.baseServings)) {
    errors.push(
      validationError(
        "component-base-servings-invalid",
        "Base servings must be greater than zero.",
        "baseServings",
      ),
    );
  }

  validateOptionalMinutes(input.prepTimeMinutes, "prepTimeMinutes", errors);
  validateOptionalMinutes(input.cookTimeMinutes, "cookTimeMinutes", errors);
  validateIngredients(input.ingredients, errors);
  validateSteps(input.steps ?? [], errors);

  if (input.createdAt.trim().length === 0) {
    errors.push(
      validationError("component-date-required", "Created date is required.", "createdAt"),
    );
  }

  if (input.updatedAt.trim().length === 0) {
    errors.push(
      validationError("component-date-required", "Updated date is required.", "updatedAt"),
    );
  }

  return errors;
}

function validateIngredients(
  ingredients: ReadonlyArray<Ingredient>,
  errors: RecipeComponentValidationError[],
) {
  if (ingredients.length === 0) {
    errors.push(
      validationError(
        "component-ingredients-required",
        "At least one ingredient is required.",
        "ingredients",
      ),
    );
    return;
  }

  ingredients.forEach((ingredient, index) => {
    if (ingredient.name.trim().length === 0) {
      errors.push(
        validationError(
          "component-ingredient-name-required",
          "Ingredient name is required.",
          `ingredients.${index}.name`,
        ),
      );
    }

    if (!isPositiveNumber(ingredient.quantity)) {
      errors.push(
        validationError(
          "component-ingredient-quantity-invalid",
          "Ingredient quantity must be greater than zero.",
          `ingredients.${index}.quantity`,
        ),
      );
    }

    if (ingredient.unit.trim().length === 0) {
      errors.push(
        validationError(
          "component-ingredient-unit-required",
          "Ingredient unit is required.",
          `ingredients.${index}.unit`,
        ),
      );
    }
  });
}

function validateSteps(steps: ReadonlyArray<RecipeStep>, errors: RecipeComponentValidationError[]) {
  steps.forEach((step, index) => {
    if (!Number.isInteger(step.position) || step.position <= 0 || step.text.trim().length === 0) {
      errors.push(
        validationError(
          "component-step-invalid",
          "Component steps must have a position and text.",
          `steps.${index}`,
        ),
      );
    }
  });
}

function validateOptionalMinutes(
  value: number | undefined,
  path: string,
  errors: RecipeComponentValidationError[],
) {
  if (value === undefined) {
    return;
  }

  if (!Number.isFinite(value) || value < 0) {
    errors.push(
      validationError("component-time-invalid", "Time values must be zero or greater.", path),
    );
  }
}

function validationError(
  code: RecipeComponentValidationErrorCode,
  message: string,
  path: string,
): RecipeComponentValidationError {
  return { code, message, path };
}

function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

function optionalTrim(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}
