import { err, ok, type Result } from "../../../core/result/Result";

export type RecipeDifficulty = "beginner" | "intermediate";

export type RecipePhoto = {
  localId: string;
  altText?: string;
};

export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  note?: string;
  group?: string;
  scaleMode?: IngredientScaleMode;
};

export type IngredientScaleMode = "linear" | "integer" | "fixed" | "toTaste" | "panDependent";

export type RecipeStep = {
  position: number;
  text: string;
};

export type RecipePracticalGuidance = {
  prepAhead?: string;
  refrigeratorStorage?: string;
  freezerStorage?: string;
  reheating?: string;
  holding?: string;
  leftoverUse?: string;
};

export type WarningVerificationStatus = "unverified" | "estimated" | "userVerified";

export type BigNineAllergen =
  | "milk"
  | "eggs"
  | "fish"
  | "crustaceanShellfish"
  | "treeNuts"
  | "peanuts"
  | "wheat"
  | "soybeans"
  | "sesame";

export type RecipeAllergenFlag = {
  allergen: BigNineAllergen;
  status: WarningVerificationStatus;
};

export type RecipeDietaryFlag = {
  label: string;
  status: WarningVerificationStatus;
};

export type RecipeDietaryMetadata = {
  allergens: ReadonlyArray<RecipeAllergenFlag>;
  dietaryTags: ReadonlyArray<RecipeDietaryFlag>;
};

export type NutritionStatus = "notCalculated" | "estimated" | "partiallyMapped" | "userVerified";

export type NutritionMetric = "calories" | "protein" | "carbs" | "fat" | "fiber" | "sodium";

export type NutritionUnit = "kcal" | "g" | "mg";

export type RecipeNutritionValue = {
  amount: number;
  unit: NutritionUnit;
  status: NutritionStatus;
  source: string;
};

export type RecipeNutritionEstimate = Partial<Record<NutritionMetric, RecipeNutritionValue>>;

export type Recipe = {
  id: string;
  title: string;
  description: string;
  baseServings: number;
  ingredients: ReadonlyArray<Ingredient>;
  steps: ReadonlyArray<RecipeStep>;
  cookbookId: string;
  categoryPath: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  difficulty: RecipeDifficulty;
  notes?: string;
  guidance?: RecipePracticalGuidance;
  dietary?: RecipeDietaryMetadata;
  nutrition?: RecipeNutritionEstimate;
  isFavorite: boolean;
  photo?: RecipePhoto;
  createdAt: string;
  updatedAt: string;
};

export type IngredientInput = Ingredient;
export type RecipeStepInput = RecipeStep;

export type RecipeInput = {
  id: string;
  title: string;
  description?: string;
  baseServings: number;
  ingredients: ReadonlyArray<IngredientInput>;
  steps: ReadonlyArray<RecipeStepInput>;
  cookbookId: string;
  categoryPath?: ReadonlyArray<string>;
  tags?: ReadonlyArray<string>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  difficulty: RecipeDifficulty;
  notes?: string;
  guidance?: RecipePracticalGuidance;
  dietary?: RecipeDietaryMetadata;
  nutrition?: RecipeNutritionEstimate;
  isFavorite?: boolean;
  photo?: RecipePhoto;
  createdAt: string;
  updatedAt: string;
};

export type RecipeValidationErrorCode =
  | "recipe-id-required"
  | "recipe-title-required"
  | "recipe-base-servings-invalid"
  | "recipe-cookbook-required"
  | "recipe-ingredients-required"
  | "ingredient-name-required"
  | "ingredient-quantity-invalid"
  | "ingredient-unit-required"
  | "ingredient-scale-mode-invalid"
  | "recipe-steps-required"
  | "recipe-step-invalid"
  | "recipe-time-invalid"
  | "recipe-allergen-invalid"
  | "recipe-dietary-flag-invalid"
  | "recipe-nutrition-invalid"
  | "recipe-date-required";

export type RecipeValidationError = {
  code: RecipeValidationErrorCode;
  message: string;
  path: string;
};

export function createRecipe(input: RecipeInput): Result<Recipe, RecipeValidationError[]> {
  const errors = validateRecipeInput(input);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: input.id.trim(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    baseServings: input.baseServings,
    ingredients: input.ingredients.map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit.trim(),
      note: ingredient.note?.trim(),
      group: ingredient.group?.trim(),
      scaleMode: ingredient.scaleMode,
    })),
    steps: input.steps.map((step) => ({
      position: step.position,
      text: step.text.trim(),
    })),
    cookbookId: input.cookbookId.trim(),
    categoryPath: (input.categoryPath ?? []).map((category) => category.trim()),
    tags: normalizeTags(input.tags ?? []),
    prepTimeMinutes: input.prepTimeMinutes,
    cookTimeMinutes: input.cookTimeMinutes,
    difficulty: input.difficulty,
    notes: input.notes?.trim(),
    guidance: normalizeGuidance(input.guidance),
    dietary: normalizeDietaryMetadata(input.dietary),
    nutrition: normalizeNutritionEstimate(input.nutrition),
    isFavorite: input.isFavorite ?? false,
    photo: input.photo,
    createdAt: input.createdAt.trim(),
    updatedAt: input.updatedAt.trim(),
  });
}

function validateRecipeInput(input: RecipeInput): RecipeValidationError[] {
  const errors: RecipeValidationError[] = [];

  if (input.id.trim().length === 0) {
    errors.push(validationError("recipe-id-required", "Recipe id is required.", "id"));
  }

  if (input.title.trim().length === 0) {
    errors.push(validationError("recipe-title-required", "Recipe title is required.", "title"));
  }

  if (!isPositiveNumber(input.baseServings)) {
    errors.push(
      validationError(
        "recipe-base-servings-invalid",
        "Base servings must be greater than zero.",
        "baseServings",
      ),
    );
  }

  if (input.cookbookId.trim().length === 0) {
    errors.push(
      validationError("recipe-cookbook-required", "Cookbook id is required.", "cookbookId"),
    );
  }

  validateOptionalMinutes(input.prepTimeMinutes, "prepTimeMinutes", errors);
  validateOptionalMinutes(input.cookTimeMinutes, "cookTimeMinutes", errors);
  validateIngredients(input.ingredients, errors);
  validateSteps(input.steps, errors);
  validateDietaryMetadata(input.dietary, errors);
  validateNutritionEstimate(input.nutrition, errors);

  if (input.createdAt.trim().length === 0) {
    errors.push(validationError("recipe-date-required", "Created date is required.", "createdAt"));
  }

  if (input.updatedAt.trim().length === 0) {
    errors.push(validationError("recipe-date-required", "Updated date is required.", "updatedAt"));
  }

  return errors;
}

function validateIngredients(
  ingredients: ReadonlyArray<IngredientInput>,
  errors: RecipeValidationError[],
) {
  if (ingredients.length === 0) {
    errors.push(
      validationError(
        "recipe-ingredients-required",
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
          "ingredient-name-required",
          "Ingredient name is required.",
          `ingredients.${index}.name`,
        ),
      );
    }

    if (!isPositiveNumber(ingredient.quantity)) {
      errors.push(
        validationError(
          "ingredient-quantity-invalid",
          "Ingredient quantity must be greater than zero.",
          `ingredients.${index}.quantity`,
        ),
      );
    }

    if (ingredient.unit.trim().length === 0) {
      errors.push(
        validationError(
          "ingredient-unit-required",
          "Ingredient unit is required.",
          `ingredients.${index}.unit`,
        ),
      );
    }

    if (ingredient.scaleMode && !ingredientScaleModes.includes(ingredient.scaleMode)) {
      errors.push(
        validationError(
          "ingredient-scale-mode-invalid",
          "Ingredient scale mode is invalid.",
          `ingredients.${index}.scaleMode`,
        ),
      );
    }
  });
}

function validateSteps(steps: ReadonlyArray<RecipeStepInput>, errors: RecipeValidationError[]) {
  if (steps.length === 0) {
    errors.push(
      validationError("recipe-steps-required", "At least one step is required.", "steps"),
    );
    return;
  }

  steps.forEach((step, index) => {
    if (!Number.isInteger(step.position) || step.position <= 0 || step.text.trim().length === 0) {
      errors.push(
        validationError(
          "recipe-step-invalid",
          "Recipe step needs a positive position and text.",
          `steps.${index}`,
        ),
      );
    }
  });
}

function validateOptionalMinutes(
  value: number | undefined,
  path: string,
  errors: RecipeValidationError[],
) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    errors.push(validationError("recipe-time-invalid", "Time must be zero or greater.", path));
  }
}

function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

function normalizeTags(tags: ReadonlyArray<string>) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.toLowerCase()),
    ),
  );
}

function normalizeGuidance(
  guidance: RecipePracticalGuidance | undefined,
): RecipePracticalGuidance | undefined {
  if (!guidance) {
    return undefined;
  }

  const normalizedGuidance: RecipePracticalGuidance = {
    prepAhead: optionalTrim(guidance.prepAhead),
    refrigeratorStorage: optionalTrim(guidance.refrigeratorStorage),
    freezerStorage: optionalTrim(guidance.freezerStorage),
    reheating: optionalTrim(guidance.reheating),
    holding: optionalTrim(guidance.holding),
    leftoverUse: optionalTrim(guidance.leftoverUse),
  };

  return Object.values(normalizedGuidance).some(Boolean) ? normalizedGuidance : undefined;
}

function optionalTrim(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

const bigNineAllergens: ReadonlyArray<BigNineAllergen> = [
  "milk",
  "eggs",
  "fish",
  "crustaceanShellfish",
  "treeNuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
];

const warningVerificationStatuses: ReadonlyArray<WarningVerificationStatus> = [
  "unverified",
  "estimated",
  "userVerified",
];

const nutritionStatuses: ReadonlyArray<NutritionStatus> = [
  "notCalculated",
  "estimated",
  "partiallyMapped",
  "userVerified",
];

const nutritionUnitsByMetric: Record<NutritionMetric, NutritionUnit> = {
  calories: "kcal",
  protein: "g",
  carbs: "g",
  fat: "g",
  fiber: "g",
  sodium: "mg",
};

const nutritionMetrics: ReadonlyArray<NutritionMetric> = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sodium",
];

const ingredientScaleModes: ReadonlyArray<IngredientScaleMode> = [
  "linear",
  "integer",
  "fixed",
  "toTaste",
  "panDependent",
];

function validateDietaryMetadata(
  dietary: RecipeDietaryMetadata | undefined,
  errors: RecipeValidationError[],
) {
  if (!dietary) {
    return;
  }

  dietary.allergens.forEach((flag, index) => {
    if (!bigNineAllergens.includes(flag.allergen)) {
      errors.push(
        validationError(
          "recipe-allergen-invalid",
          "Allergen must be one of the Big 9 allergens.",
          `dietary.allergens.${index}.allergen`,
        ),
      );
    }

    if (!warningVerificationStatuses.includes(flag.status)) {
      errors.push(
        validationError(
          "recipe-allergen-invalid",
          "Allergen warning status is invalid.",
          `dietary.allergens.${index}.status`,
        ),
      );
    }
  });

  dietary.dietaryTags.forEach((flag, index) => {
    if (flag.label.trim().length === 0) {
      errors.push(
        validationError(
          "recipe-dietary-flag-invalid",
          "Dietary tag label is required.",
          `dietary.dietaryTags.${index}.label`,
        ),
      );
    }

    if (!warningVerificationStatuses.includes(flag.status)) {
      errors.push(
        validationError(
          "recipe-dietary-flag-invalid",
          "Dietary tag warning status is invalid.",
          `dietary.dietaryTags.${index}.status`,
        ),
      );
    }
  });
}

function normalizeDietaryMetadata(
  dietary: RecipeDietaryMetadata | undefined,
): RecipeDietaryMetadata | undefined {
  if (!dietary) {
    return undefined;
  }

  const allergens = Array.from(
    new Map(
      dietary.allergens.map((flag) => [
        flag.allergen,
        {
          allergen: flag.allergen,
          status: flag.status,
        },
      ]),
    ).values(),
  );
  const dietaryTags = Array.from(
    new Map(
      dietary.dietaryTags
        .map((flag) => ({
          label: flag.label.trim(),
          status: flag.status,
        }))
        .filter((flag) => flag.label.length > 0)
        .map((flag) => [flag.label.toLowerCase(), flag]),
    ).values(),
  );

  return allergens.length > 0 || dietaryTags.length > 0
    ? {
        allergens,
        dietaryTags,
      }
    : undefined;
}

function validateNutritionEstimate(
  nutrition: RecipeNutritionEstimate | undefined,
  errors: RecipeValidationError[],
) {
  if (!nutrition) {
    return;
  }

  nutritionMetrics.forEach((metric) => {
    const value = nutrition[metric];

    if (!value) {
      return;
    }

    if (!Number.isFinite(value.amount) || value.amount < 0) {
      errors.push(
        validationError(
          "recipe-nutrition-invalid",
          "Nutrition amount must be zero or greater.",
          `nutrition.${metric}.amount`,
        ),
      );
    }

    if (value.unit !== nutritionUnitsByMetric[metric]) {
      errors.push(
        validationError(
          "recipe-nutrition-invalid",
          "Nutrition unit does not match the selected metric.",
          `nutrition.${metric}.unit`,
        ),
      );
    }

    if (!nutritionStatuses.includes(value.status)) {
      errors.push(
        validationError(
          "recipe-nutrition-invalid",
          "Nutrition status is invalid.",
          `nutrition.${metric}.status`,
        ),
      );
    }

    if (value.source.trim().length === 0) {
      errors.push(
        validationError(
          "recipe-nutrition-invalid",
          "Nutrition source is required.",
          `nutrition.${metric}.source`,
        ),
      );
    }
  });
}

function normalizeNutritionEstimate(
  nutrition: RecipeNutritionEstimate | undefined,
): RecipeNutritionEstimate | undefined {
  if (!nutrition) {
    return undefined;
  }

  const normalizedNutrition: RecipeNutritionEstimate = {};

  nutritionMetrics.forEach((metric) => {
    const value = nutrition[metric];

    if (!value) {
      return;
    }

    normalizedNutrition[metric] = {
      amount: value.amount,
      unit: nutritionUnitsByMetric[metric],
      status: value.status,
      source: value.source.trim(),
    };
  });

  return Object.keys(normalizedNutrition).length > 0 ? normalizedNutrition : undefined;
}

function validationError(
  code: RecipeValidationErrorCode,
  message: string,
  path: string,
): RecipeValidationError {
  return {
    code,
    message,
    path,
  };
}
