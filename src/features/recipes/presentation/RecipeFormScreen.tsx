import { useEffect, useState } from "react";

import { ConfirmActionButton } from "../../../core/presentation/ConfirmActionButton";
import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { CookbookUseCases } from "../../cookbooks/application/cookbookUseCases";
import {
  flattenCategoryPathOptions,
  type CategoryPathOption,
} from "../../cookbooks/domain/categoryPathOptions";
import type { RecipeUseCases } from "../application/recipeUseCases";
import type {
  BigNineAllergen,
  Ingredient,
  NutritionMetric,
  NutritionStatus,
  Recipe,
  RecipeDietaryMetadata,
  RecipeDifficulty,
  RecipeInput,
  RecipeNutritionEstimate,
  RecipePracticalGuidance,
  WarningVerificationStatus,
} from "../domain/recipe";
import { nutritionMetricDefinitions } from "../domain/nutrition";

type RecipeFormScreenProps = {
  recipeUseCases: RecipeUseCases;
  cookbookUseCases: CookbookUseCases;
  mode: "create" | "edit";
  recipeId?: string;
  onCancel: () => void;
  onSaved: (recipeId: string) => void;
  onDeleted?: () => void;
};

type FormState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; values: RecipeFormValues; error?: string };

type CategoryPickerState =
  | { status: "loading" }
  | { status: "ready"; options: ReadonlyArray<CategoryPathOption> }
  | { status: "error"; message: string };

type IngredientFormRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  group: string;
  note: string;
};

type StepFormRow = {
  id: string;
  text: string;
};

type PracticalGuidanceFormValues = {
  prepAhead: string;
  refrigeratorStorage: string;
  freezerStorage: string;
  reheating: string;
  holding: string;
  leftoverUse: string;
};

type AllergenFormValue = {
  selected: boolean;
  status: WarningVerificationStatus;
};

type DietaryFormValues = {
  allergens: Record<BigNineAllergen, AllergenFormValue>;
  dietaryTags: string;
  dietaryTagStatus: WarningVerificationStatus;
};

type NutritionMetricFormValue = {
  amount: string;
  status: NutritionStatus;
  source: string;
};

type NutritionFormValues = Record<NutritionMetric, NutritionMetricFormValue>;

type RecipeFormValues = {
  title: string;
  description: string;
  baseServings: number;
  cookbookId: string;
  ingredients: IngredientFormRow[];
  steps: StepFormRow[];
  categoryPath: string;
  tags: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: RecipeDifficulty;
  notes: string;
  guidance: PracticalGuidanceFormValues;
  dietary: DietaryFormValues;
  nutrition: NutritionFormValues;
  isFavorite: boolean;
  photoLocalId: string;
};

const commonIngredientUnits = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pcs", "cloves"];

const allergenOptions: ReadonlyArray<{ value: BigNineAllergen; label: string }> = [
  { value: "milk", label: "Milk" },
  { value: "eggs", label: "Eggs" },
  { value: "fish", label: "Fish" },
  { value: "crustaceanShellfish", label: "Crustacean shellfish" },
  { value: "treeNuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "wheat", label: "Wheat" },
  { value: "soybeans", label: "Soybeans" },
  { value: "sesame", label: "Sesame" },
];

const warningStatusOptions: ReadonlyArray<{
  value: WarningVerificationStatus;
  label: string;
}> = [
  { value: "unverified", label: "Unverified" },
  { value: "estimated", label: "Estimated" },
  { value: "userVerified", label: "User verified" },
];

const nutritionStatusOptions: ReadonlyArray<{ value: NutritionStatus; label: string }> = [
  { value: "estimated", label: "Estimated" },
  { value: "partiallyMapped", label: "Partially mapped" },
  { value: "userVerified", label: "User verified" },
  { value: "notCalculated", label: "Not calculated" },
];

let rowIdSequence = 0;

export function RecipeFormScreen({
  cookbookUseCases,
  recipeUseCases,
  mode,
  recipeId,
  onCancel,
  onSaved,
  onDeleted,
}: RecipeFormScreenProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    mode === "edit" ? { status: "loading" } : { status: "ready", values: createEmptyValues() },
  );
  const [categoryPickerState, setCategoryPickerState] = useState<CategoryPickerState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      const result = await cookbookUseCases.listCookbooks();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setCategoryPickerState({ status: "error", message: result.error.message });
        return;
      }

      const options = flattenCategoryPathOptions(result.value);
      setCategoryPickerState({ status: "ready", options });

      setFormState((currentState) => {
        if (currentState.status !== "ready" || currentState.values.categoryPath.trim()) {
          return currentState;
        }

        const firstOption = options[0];

        if (!firstOption) {
          return currentState;
        }

        return {
          ...currentState,
          values: {
            ...currentState.values,
            cookbookId: firstOption.cookbookId,
            categoryPath: firstOption.path.join(" / "),
          },
        };
      });
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [cookbookUseCases]);

  useEffect(() => {
    if (mode !== "edit" || !recipeId) {
      return;
    }

    const editableRecipeId = recipeId;
    let cancelled = false;

    async function loadRecipe() {
      const result = await recipeUseCases.getRecipeDetails(editableRecipeId);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setFormState({ status: "missing" });
        return;
      }

      setFormState({ status: "ready", values: recipeToFormValues(result.value) });
    }

    void loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [mode, recipeId, recipeUseCases]);

  if (formState.status === "loading") {
    return <LoadingView title="Loading form" />;
  }

  if (formState.status === "missing") {
    return (
      <EmptyView
        title="Recipe not found"
        message="The selected recipe cannot be edited."
        action={{ label: "Back", onClick: onCancel }}
      />
    );
  }

  async function saveRecipe() {
    if (formState.status !== "ready") {
      return;
    }

    const input = formValuesToInput(formState.values, recipeId);
    const result =
      mode === "create"
        ? await recipeUseCases.createRecipe(input)
        : await recipeUseCases.updateRecipe(input);

    if (!result.ok) {
      setFormState({
        ...formState,
        error: result.error.message,
      });
      return;
    }

    onSaved(result.value.id);
  }

  async function deleteRecipe() {
    if (formState.status !== "ready" || !recipeId || !onDeleted) {
      return;
    }

    const result = await recipeUseCases.deleteRecipe(recipeId);

    if (!result.ok) {
      setFormState({
        ...formState,
        error: result.error.message,
      });
      return;
    }

    onDeleted();
  }

  function updateValues(nextValues: Partial<RecipeFormValues>) {
    updateFormValues((values) => ({
      ...values,
      ...nextValues,
    }));
  }

  function updateFormValues(buildNextValues: (values: RecipeFormValues) => RecipeFormValues) {
    setFormState((currentState) => {
      if (currentState.status !== "ready") {
        return currentState;
      }

      return {
        ...currentState,
        values: buildNextValues(currentState.values),
        error: undefined,
      };
    });
  }

  function updateIngredient(rowId: string, nextValues: Partial<IngredientFormRow>) {
    updateFormValues((values) => ({
      ...values,
      ingredients: values.ingredients.map((ingredient) =>
        ingredient.id === rowId ? { ...ingredient, ...nextValues } : ingredient,
      ),
    }));
  }

  function updateStep(rowId: string, nextValues: Partial<StepFormRow>) {
    updateFormValues((values) => ({
      ...values,
      steps: values.steps.map((step) => (step.id === rowId ? { ...step, ...nextValues } : step)),
    }));
  }

  function updateGuidance(nextGuidance: Partial<PracticalGuidanceFormValues>) {
    updateFormValues((values) => ({
      ...values,
      guidance: {
        ...values.guidance,
        ...nextGuidance,
      },
    }));
  }

  function updateAllergen(allergen: BigNineAllergen, nextAllergen: Partial<AllergenFormValue>) {
    updateFormValues((values) => ({
      ...values,
      dietary: {
        ...values.dietary,
        allergens: {
          ...values.dietary.allergens,
          [allergen]: {
            ...values.dietary.allergens[allergen],
            ...nextAllergen,
          },
        },
      },
    }));
  }

  function updateDietary(nextDietary: Partial<Omit<DietaryFormValues, "allergens">>) {
    updateFormValues((values) => ({
      ...values,
      dietary: {
        ...values.dietary,
        ...nextDietary,
      },
    }));
  }

  function updateNutrition(
    metric: NutritionMetric,
    nextNutrition: Partial<NutritionMetricFormValue>,
  ) {
    updateFormValues((values) => ({
      ...values,
      nutrition: {
        ...values.nutrition,
        [metric]: {
          ...values.nutrition[metric],
          ...nextNutrition,
        },
      },
    }));
  }

  function selectCategory(optionValue: string) {
    if (categoryPickerState.status !== "ready") {
      return;
    }

    const selectedOption = categoryPickerState.options.find(
      (option) => categoryOptionValue(option) === optionValue,
    );

    if (!selectedOption) {
      return;
    }

    updateValues({
      cookbookId: selectedOption.cookbookId,
      categoryPath: selectedOption.path.join(" / "),
    });
  }

  return (
    <section className="screen-stack" aria-labelledby="recipe-form-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">{mode === "create" ? "New recipe" : "Edit recipe"}</p>
          <h2 id="recipe-form-title">{mode === "create" ? "Add recipe" : "Edit recipe"}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {formState.error ? (
        <ErrorView title="Could not save recipe" message={formState.error} />
      ) : null}

      <div className="form-grid">
        <label>
          <span>Title</span>
          <input
            aria-label="Recipe title"
            value={formState.values.title}
            onChange={(event) => updateValues({ title: event.target.value })}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            aria-label="Recipe description"
            value={formState.values.description}
            onChange={(event) => updateValues({ description: event.target.value })}
          />
        </label>
        <label>
          <span>Base servings</span>
          <input
            aria-label="Base servings"
            min="1"
            type="number"
            value={formState.values.baseServings}
            onChange={(event) => updateValues({ baseServings: Number(event.target.value) })}
          />
        </label>
      </div>

      <section className="collection-editor" aria-labelledby="ingredients-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">Recipe structure</p>
            <h3 id="ingredients-form-title">Ingredients</h3>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              updateFormValues((values) => ({
                ...values,
                ingredients: [...values.ingredients, createIngredientRow()],
              }))
            }
          >
            Add ingredient
          </button>
        </div>

        {formState.values.ingredients.map((ingredient, index) => (
          <fieldset className="collection-row" key={ingredient.id}>
            <legend>Ingredient {index + 1}</legend>
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  aria-label={`Ingredient ${index + 1} name`}
                  value={ingredient.name}
                  onChange={(event) =>
                    updateIngredient(ingredient.id, { name: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Quantity</span>
                <input
                  aria-label={`Ingredient ${index + 1} quantity`}
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={ingredient.quantity}
                  onChange={(event) =>
                    updateIngredient(ingredient.id, { quantity: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Unit</span>
                <select
                  aria-label={`Ingredient ${index + 1} unit`}
                  value={ingredient.unit}
                  onChange={(event) =>
                    updateIngredient(ingredient.id, { unit: event.target.value })
                  }
                >
                  {unitOptionsFor(ingredient.unit).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Group</span>
                <input
                  aria-label={`Ingredient ${index + 1} group`}
                  placeholder="Sauce, main, garnish"
                  value={ingredient.group}
                  onChange={(event) =>
                    updateIngredient(ingredient.id, { group: event.target.value })
                  }
                />
              </label>
              <label className="full-span">
                <span>Prep note</span>
                <input
                  aria-label={`Ingredient ${index + 1} prep note`}
                  placeholder="diced, divided, optional"
                  value={ingredient.note}
                  onChange={(event) =>
                    updateIngredient(ingredient.id, { note: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="collection-row__actions">
              <button
                className="secondary-button"
                type="button"
                disabled={index === 0}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    ingredients: moveRow(values.ingredients, ingredient.id, -1),
                  }))
                }
              >
                Move up
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={index === formState.values.ingredients.length - 1}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    ingredients: moveRow(values.ingredients, ingredient.id, 1),
                  }))
                }
              >
                Move down
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    ingredients: duplicateIngredient(values.ingredients, ingredient.id),
                  }))
                }
              >
                Duplicate
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={formState.values.ingredients.length === 1}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    ingredients: removeRow(values.ingredients, ingredient.id, createIngredientRow),
                  }))
                }
              >
                Remove
              </button>
            </div>
          </fieldset>
        ))}
      </section>

      <section className="collection-editor" aria-labelledby="steps-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">Cooking flow</p>
            <h3 id="steps-form-title">Steps</h3>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              updateFormValues((values) => ({
                ...values,
                steps: [...values.steps, createStepRow()],
              }))
            }
          >
            Add step
          </button>
        </div>

        {formState.values.steps.map((step, index) => (
          <fieldset className="collection-row" key={step.id}>
            <legend>Step {index + 1}</legend>
            <label>
              <span>Instruction</span>
              <textarea
                aria-label={`Step ${index + 1} text`}
                value={step.text}
                onChange={(event) => updateStep(step.id, { text: event.target.value })}
              />
            </label>
            <div className="collection-row__actions">
              <button
                className="secondary-button"
                type="button"
                disabled={index === 0}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    steps: moveRow(values.steps, step.id, -1),
                  }))
                }
              >
                Move up
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={index === formState.values.steps.length - 1}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    steps: moveRow(values.steps, step.id, 1),
                  }))
                }
              >
                Move down
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    steps: duplicateStep(values.steps, step.id),
                  }))
                }
              >
                Duplicate
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={formState.values.steps.length === 1}
                onClick={() =>
                  updateFormValues((values) => ({
                    ...values,
                    steps: removeRow(values.steps, step.id, createStepRow),
                  }))
                }
              >
                Remove
              </button>
            </div>
          </fieldset>
        ))}
      </section>

      <div className="form-grid">
        <label>
          <span>Prep minutes</span>
          <input
            aria-label="Prep minutes"
            min="0"
            type="number"
            value={formState.values.prepTimeMinutes}
            onChange={(event) => updateValues({ prepTimeMinutes: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Cook minutes</span>
          <input
            aria-label="Cook minutes"
            min="0"
            type="number"
            value={formState.values.cookTimeMinutes}
            onChange={(event) => updateValues({ cookTimeMinutes: Number(event.target.value) })}
          />
        </label>
        {categoryPickerState.status === "loading" ? (
          <div className="state-view" role="status">
            <p className="state-view__title">Loading categories</p>
          </div>
        ) : null}
        {categoryPickerState.status === "error" ? (
          <ErrorView title="Categories unavailable" message={categoryPickerState.message} />
        ) : null}
        {categoryPickerState.status === "ready" && categoryPickerState.options.length === 0 ? (
          <EmptyView
            title="No recipe categories"
            message="Create a cookbook category before assigning this recipe."
          />
        ) : null}
        {categoryPickerState.status === "ready" && categoryPickerState.options.length > 0 ? (
          <label>
            <span>Category</span>
            <select
              aria-label="Recipe category"
              value={selectedCategoryOptionValue(formState.values, categoryPickerState.options)}
              onChange={(event) => selectCategory(event.target.value)}
            >
              <option value="">Choose category</option>
              {categoryPickerState.options.map((option) => (
                <option key={categoryOptionValue(option)} value={categoryOptionValue(option)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Tags</span>
          <input
            aria-label="Recipe tags"
            value={formState.values.tags}
            onChange={(event) => updateValues({ tags: event.target.value })}
          />
        </label>
        <label>
          <span>Photo reference</span>
          <input
            aria-label="Local photo reference"
            value={formState.values.photoLocalId}
            onChange={(event) => updateValues({ photoLocalId: event.target.value })}
            placeholder="Optional local file reference"
          />
        </label>
        <label>
          <span>Difficulty</span>
          <select
            aria-label="Recipe difficulty"
            value={formState.values.difficulty}
            onChange={(event) =>
              updateValues({ difficulty: event.target.value as RecipeDifficulty })
            }
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
          </select>
        </label>
        <label className="full-span">
          <span>Recipe notes</span>
          <textarea
            aria-label="Recipe notes"
            value={formState.values.notes}
            onChange={(event) => updateValues({ notes: event.target.value })}
          />
        </label>
      </div>

      <section className="collection-editor" aria-labelledby="guidance-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">Planning guidance</p>
            <h3 id="guidance-form-title">Storage and leftovers</h3>
          </div>
        </div>
        <p className="muted-text">
          User-entered notes only. Review freshness and safety before serving.
        </p>
        <div className="form-grid">
          <label>
            <span>Prep ahead</span>
            <textarea
              aria-label="Prep-ahead notes"
              value={formState.values.guidance.prepAhead}
              onChange={(event) => updateGuidance({ prepAhead: event.target.value })}
            />
          </label>
          <label>
            <span>Refrigerator storage</span>
            <textarea
              aria-label="Refrigerator storage"
              value={formState.values.guidance.refrigeratorStorage}
              onChange={(event) => updateGuidance({ refrigeratorStorage: event.target.value })}
            />
          </label>
          <label>
            <span>Freezer storage</span>
            <textarea
              aria-label="Freezer storage"
              value={formState.values.guidance.freezerStorage}
              onChange={(event) => updateGuidance({ freezerStorage: event.target.value })}
            />
          </label>
          <label>
            <span>Reheating</span>
            <textarea
              aria-label="Reheating notes"
              value={formState.values.guidance.reheating}
              onChange={(event) => updateGuidance({ reheating: event.target.value })}
            />
          </label>
          <label>
            <span>Holding</span>
            <textarea
              aria-label="Holding notes"
              value={formState.values.guidance.holding}
              onChange={(event) => updateGuidance({ holding: event.target.value })}
            />
          </label>
          <label>
            <span>Leftovers</span>
            <textarea
              aria-label="Leftover ideas"
              value={formState.values.guidance.leftoverUse}
              onChange={(event) => updateGuidance({ leftoverUse: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="collection-editor" aria-labelledby="dietary-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">Dietary context</p>
            <h3 id="dietary-form-title">Allergen and dietary notes</h3>
          </div>
        </div>
        <p className="muted-text">
          User-entered warnings only. This does not guarantee a recipe is safe for an allergy or
          diet.
        </p>
        <div className="dietary-grid">
          {allergenOptions.map((option) => {
            const allergen = formState.values.dietary.allergens[option.value];

            return (
              <div className="dietary-row" key={option.value}>
                <label className="checkbox-row">
                  <input
                    aria-label={`Contains ${option.label.toLowerCase()}`}
                    checked={allergen.selected}
                    onChange={(event) =>
                      updateAllergen(option.value, { selected: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Contains {option.label.toLowerCase()}
                </label>
                <label>
                  <span>Status</span>
                  <select
                    aria-label={`${option.label} warning status`}
                    disabled={!allergen.selected}
                    value={allergen.status}
                    onChange={(event) =>
                      updateAllergen(option.value, {
                        status: event.target.value as WarningVerificationStatus,
                      })
                    }
                  >
                    {warningStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
        <div className="form-grid">
          <label>
            <span>Dietary tags</span>
            <input
              aria-label="Dietary tags"
              placeholder="vegetarian, low sodium"
              value={formState.values.dietary.dietaryTags}
              onChange={(event) => updateDietary({ dietaryTags: event.target.value })}
            />
          </label>
          <label>
            <span>Dietary tag status</span>
            <select
              aria-label="Dietary tag warning status"
              value={formState.values.dietary.dietaryTagStatus}
              onChange={(event) =>
                updateDietary({
                  dietaryTagStatus: event.target.value as WarningVerificationStatus,
                })
              }
            >
              {warningStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="collection-editor" aria-labelledby="nutrition-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">Nutrition</p>
            <h3 id="nutrition-form-title">Manual estimates</h3>
          </div>
        </div>
        <p className="muted-text">
          Optional estimates for the whole recipe. These are not clinical recommendations.
        </p>
        <div className="nutrition-grid">
          {nutritionMetricDefinitions.map((definition) => {
            const nutrition = formState.values.nutrition[definition.metric];

            return (
              <fieldset className="collection-row" key={definition.metric}>
                <legend>{definition.label}</legend>
                <div className="form-grid">
                  <label>
                    <span>Amount ({definition.unit})</span>
                    <input
                      aria-label={`${definition.label} amount`}
                      min="0"
                      step="0.1"
                      type="number"
                      value={nutrition.amount}
                      onChange={(event) =>
                        updateNutrition(definition.metric, { amount: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      aria-label={`${definition.label} nutrition status`}
                      value={nutrition.status}
                      onChange={(event) =>
                        updateNutrition(definition.metric, {
                          status: event.target.value as NutritionStatus,
                        })
                      }
                    >
                      {nutritionStatusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full-span">
                    <span>Source</span>
                    <input
                      aria-label={`${definition.label} nutrition source`}
                      value={nutrition.source}
                      onChange={(event) =>
                        updateNutrition(definition.metric, { source: event.target.value })
                      }
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <div className="form-grid">
        <label className="checkbox-row">
          <input
            checked={formState.values.isFavorite}
            onChange={(event) => updateValues({ isFavorite: event.target.checked })}
            type="checkbox"
          />
          Favorite
        </label>
      </div>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={() => void saveRecipe()}>
          Save recipe
        </button>
        {mode === "edit" && onDeleted ? (
          <ConfirmActionButton
            idleLabel="Delete"
            confirmLabel="Confirm delete"
            onConfirm={() => void deleteRecipe()}
          />
        ) : null}
      </div>
    </section>
  );
}

function createEmptyValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    baseServings: 2,
    cookbookId: "cookbook-default",
    ingredients: [createIngredientRow()],
    steps: [createStepRow()],
    categoryPath: "Dinner",
    tags: "",
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    difficulty: "beginner",
    notes: "",
    guidance: createEmptyGuidanceValues(),
    dietary: createEmptyDietaryValues(),
    nutrition: createEmptyNutritionValues(),
    isFavorite: false,
    photoLocalId: "",
  };
}

function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    title: recipe.title,
    description: recipe.description,
    baseServings: recipe.baseServings,
    cookbookId: recipe.cookbookId,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map(ingredientToFormRow)
        : [createIngredientRow()],
    steps:
      recipe.steps.length > 0
        ? [...recipe.steps]
            .sort((firstStep, secondStep) => firstStep.position - secondStep.position)
            .map((step) => createStepRow({ text: step.text }))
        : [createStepRow()],
    categoryPath: recipe.categoryPath.join(" / "),
    tags: recipe.tags.join(", "),
    prepTimeMinutes: recipe.prepTimeMinutes ?? 0,
    cookTimeMinutes: recipe.cookTimeMinutes ?? 0,
    difficulty: recipe.difficulty,
    notes: recipe.notes ?? "",
    guidance: guidanceToFormValues(recipe.guidance),
    dietary: dietaryToFormValues(recipe.dietary),
    nutrition: nutritionToFormValues(recipe.nutrition),
    isFavorite: recipe.isFavorite,
    photoLocalId: recipe.photo?.localId ?? "",
  };
}

function ingredientToFormRow(ingredient: Ingredient): IngredientFormRow {
  return createIngredientRow({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    group: ingredient.group ?? "",
    note: ingredient.note ?? "",
  });
}

function formValuesToInput(values: RecipeFormValues, recipeId?: string): RecipeInput {
  const now = new Date().toISOString();

  return {
    id: recipeId ?? `recipe-${Date.now()}`,
    title: values.title,
    description: values.description,
    baseServings: values.baseServings,
    ingredients: values.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      note: optionalText(ingredient.note),
      group: optionalText(ingredient.group),
    })),
    steps: values.steps.map((step, index) => ({
      position: index + 1,
      text: step.text,
    })),
    cookbookId: values.cookbookId,
    categoryPath: values.categoryPath
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean),
    tags: values.tags.split(",").map((tag) => tag.trim()),
    prepTimeMinutes: values.prepTimeMinutes,
    cookTimeMinutes: values.cookTimeMinutes,
    difficulty: values.difficulty,
    notes: values.notes,
    guidance: guidanceFromFormValues(values.guidance),
    dietary: dietaryFromFormValues(values.dietary),
    nutrition: nutritionFromFormValues(values.nutrition),
    isFavorite: values.isFavorite,
    photo:
      values.photoLocalId.trim().length > 0 ? { localId: values.photoLocalId.trim() } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function createIngredientRow(
  values: Partial<Omit<IngredientFormRow, "id">> = {},
): IngredientFormRow {
  return {
    id: createRowId("ingredient"),
    name: values.name ?? "",
    quantity: values.quantity ?? 1,
    unit: values.unit ?? "g",
    group: values.group ?? "",
    note: values.note ?? "",
  };
}

function createEmptyGuidanceValues(): PracticalGuidanceFormValues {
  return {
    prepAhead: "",
    refrigeratorStorage: "",
    freezerStorage: "",
    reheating: "",
    holding: "",
    leftoverUse: "",
  };
}

function createEmptyDietaryValues(): DietaryFormValues {
  return {
    allergens: createEmptyAllergenValues(),
    dietaryTags: "",
    dietaryTagStatus: "unverified",
  };
}

function createEmptyNutritionValues(): NutritionFormValues {
  return Object.fromEntries(
    nutritionMetricDefinitions.map((definition) => [
      definition.metric,
      {
        amount: "",
        status: "estimated",
        source: "Manual entry",
      },
    ]),
  ) as NutritionFormValues;
}

function createEmptyAllergenValues(): Record<BigNineAllergen, AllergenFormValue> {
  return Object.fromEntries(
    allergenOptions.map((option) => [
      option.value,
      {
        selected: false,
        status: "unverified",
      },
    ]),
  ) as Record<BigNineAllergen, AllergenFormValue>;
}

function guidanceToFormValues(
  guidance: RecipePracticalGuidance | undefined,
): PracticalGuidanceFormValues {
  return {
    prepAhead: guidance?.prepAhead ?? "",
    refrigeratorStorage: guidance?.refrigeratorStorage ?? "",
    freezerStorage: guidance?.freezerStorage ?? "",
    reheating: guidance?.reheating ?? "",
    holding: guidance?.holding ?? "",
    leftoverUse: guidance?.leftoverUse ?? "",
  };
}

function guidanceFromFormValues(
  guidance: PracticalGuidanceFormValues,
): RecipePracticalGuidance | undefined {
  const normalizedGuidance: RecipePracticalGuidance = {
    prepAhead: optionalText(guidance.prepAhead),
    refrigeratorStorage: optionalText(guidance.refrigeratorStorage),
    freezerStorage: optionalText(guidance.freezerStorage),
    reheating: optionalText(guidance.reheating),
    holding: optionalText(guidance.holding),
    leftoverUse: optionalText(guidance.leftoverUse),
  };

  return Object.values(normalizedGuidance).some(Boolean) ? normalizedGuidance : undefined;
}

function dietaryToFormValues(dietary: RecipeDietaryMetadata | undefined): DietaryFormValues {
  const allergens = createEmptyAllergenValues();

  dietary?.allergens.forEach((flag) => {
    allergens[flag.allergen] = {
      selected: true,
      status: flag.status,
    };
  });

  return {
    allergens,
    dietaryTags: dietary?.dietaryTags.map((flag) => flag.label).join(", ") ?? "",
    dietaryTagStatus: dietary?.dietaryTags[0]?.status ?? "unverified",
  };
}

function dietaryFromFormValues(dietary: DietaryFormValues): RecipeDietaryMetadata | undefined {
  const allergens = allergenOptions
    .filter((option) => dietary.allergens[option.value].selected)
    .map((option) => ({
      allergen: option.value,
      status: dietary.allergens[option.value].status,
    }));
  const dietaryTags = dietary.dietaryTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((label) => ({
      label,
      status: dietary.dietaryTagStatus,
    }));

  return allergens.length > 0 || dietaryTags.length > 0
    ? {
        allergens,
        dietaryTags,
      }
    : undefined;
}

function nutritionToFormValues(
  nutrition: RecipeNutritionEstimate | undefined,
): NutritionFormValues {
  const values = createEmptyNutritionValues();

  nutritionMetricDefinitions.forEach((definition) => {
    const value = nutrition?.[definition.metric];

    if (!value) {
      return;
    }

    values[definition.metric] = {
      amount: String(value.amount),
      status: value.status,
      source: value.source,
    };
  });

  return values;
}

function nutritionFromFormValues(
  nutrition: NutritionFormValues,
): RecipeNutritionEstimate | undefined {
  const estimate: RecipeNutritionEstimate = {};

  nutritionMetricDefinitions.forEach((definition) => {
    const value = nutrition[definition.metric];

    if (value.amount.trim().length === 0) {
      return;
    }

    estimate[definition.metric] = {
      amount: Number(value.amount),
      unit: definition.unit,
      status: value.status,
      source: value.source.trim().length > 0 ? value.source.trim() : "Manual entry",
    };
  });

  return Object.keys(estimate).length > 0 ? estimate : undefined;
}

function selectedCategoryOptionValue(
  values: RecipeFormValues,
  options: ReadonlyArray<CategoryPathOption>,
) {
  const categoryPath = values.categoryPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const selectedOption = options.find(
    (option) =>
      option.cookbookId === values.cookbookId && isSameCategoryPath(option.path, categoryPath),
  );

  return selectedOption ? categoryOptionValue(selectedOption) : "";
}

function categoryOptionValue(option: CategoryPathOption) {
  return `${option.cookbookId}:${option.categoryId}`;
}

function isSameCategoryPath(firstPath: ReadonlyArray<string>, secondPath: ReadonlyArray<string>) {
  return (
    firstPath.length === secondPath.length &&
    firstPath.every((segment, index) => segment === secondPath[index])
  );
}

function createStepRow(values: Partial<Omit<StepFormRow, "id">> = {}): StepFormRow {
  return {
    id: createRowId("step"),
    text: values.text ?? "",
  };
}

function createRowId(prefix: string) {
  rowIdSequence += 1;
  return `${prefix}-${rowIdSequence}`;
}

function moveRow<TRow extends { id: string }>(
  rows: TRow[],
  rowId: string,
  direction: -1 | 1,
): TRow[] {
  const currentIndex = rows.findIndex((row) => row.id === rowId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= rows.length) {
    return rows;
  }

  const nextRows = [...rows];
  const [movedRow] = nextRows.splice(currentIndex, 1);
  nextRows.splice(nextIndex, 0, movedRow);
  return nextRows;
}

function duplicateIngredient(rows: IngredientFormRow[], rowId: string): IngredientFormRow[] {
  return rows.flatMap((ingredient) =>
    ingredient.id === rowId ? [ingredient, createIngredientRow(ingredient)] : [ingredient],
  );
}

function duplicateStep(rows: StepFormRow[], rowId: string): StepFormRow[] {
  return rows.flatMap((step) => (step.id === rowId ? [step, createStepRow(step)] : [step]));
}

function removeRow<TRow extends { id: string }>(
  rows: TRow[],
  rowId: string,
  createFallbackRow: () => TRow,
): TRow[] {
  const nextRows = rows.filter((row) => row.id !== rowId);
  return nextRows.length > 0 ? nextRows : [createFallbackRow()];
}

function unitOptionsFor(unit: string) {
  const normalizedUnit = unit.trim();

  if (normalizedUnit.length > 0 && !commonIngredientUnits.includes(normalizedUnit)) {
    return [normalizedUnit, ...commonIngredientUnits];
  }

  return commonIngredientUnits;
}

function optionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}
