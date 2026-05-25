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
  AllergenPresenceStatus,
  BigNineAllergen,
  Ingredient,
  NutritionMetric,
  Recipe,
  RecipeDietaryMetadata,
  RecipeDifficulty,
  RecipeInput,
  RecipeNutritionEstimate,
  RecipePracticalGuidance,
} from "../domain/recipe";
import { ingredientUnitOptions } from "../domain/ingredientUnits";
import { formatNutritionAmount, nutritionMetricDefinitions } from "../domain/nutrition";

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

type TemplateImportState =
  | { status: "loading" }
  | {
      status: "ready";
      templates: ReadonlyArray<Recipe>;
      error?: string;
      message?: string;
    }
  | { status: "error"; message: string };

type IngredientFormRow = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  group: string;
  note: string;
  sourceTemplateId?: string;
  sourceTemplateTitle?: string;
};

type StepFormRow = {
  id: string;
  text: string;
  sourceTemplateId?: string;
  sourceTemplateTitle?: string;
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
  status: AllergenPresenceStatus;
};

type DietaryFormValues = {
  allergens: Record<BigNineAllergen, AllergenFormValue>;
};

type NutritionMetricFormValue = {
  amount: string;
};

type NutritionFormValues = Record<NutritionMetric, NutritionMetricFormValue>;

type ImportedTemplateFormValue = {
  id: string;
  title: string;
  nutrition?: RecipeNutritionEstimate;
  ingredientsExpanded: boolean;
  stepsExpanded: boolean;
};

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
  importedTemplates: ImportedTemplateFormValue[];
  isFavorite: boolean;
  isTemplate: boolean;
  photoLocalId: string;
};

const commonIngredientUnits = ingredientUnitOptions;

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
  const [templateImportState, setTemplateImportState] = useState<TemplateImportState>({
    status: "loading",
  });
  const [selectedTemplateRecipeId, setSelectedTemplateRecipeId] = useState("");

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

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    let cancelled = false;

    async function loadTemplates() {
      const result = await recipeUseCases.listRecipes();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setTemplateImportState({ status: "error", message: result.error.message });
        return;
      }

      const templates = result.value.filter((recipe) => recipe.isTemplate);
      setTemplateImportState({ status: "ready", templates });
      setSelectedTemplateRecipeId((currentId) => currentId || templates[0]?.id || "");
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [mode, recipeUseCases]);

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

  const readyFormValues = formState.values;

  async function saveRecipe() {
    if (formState.status !== "ready") {
      return;
    }

    const localValidationMessage = validateRecipeFormValues(formState.values);

    if (localValidationMessage) {
      setFormState({
        ...formState,
        error: localValidationMessage,
      });
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

  function updateImportedTemplateExpansion(
    templateId: string,
    field: "ingredientsExpanded" | "stepsExpanded",
    expanded: boolean,
  ) {
    updateFormValues((values) => ({
      ...values,
      importedTemplates: values.importedTemplates.map((template) =>
        template.id === templateId ? { ...template, [field]: expanded } : template,
      ),
    }));
  }

  function importSelectedTemplateRecipe() {
    if (templateImportState.status !== "ready" || selectedTemplateRecipeId.trim().length === 0) {
      return;
    }

    const template = templateImportState.templates.find(
      (recipe) => recipe.id === selectedTemplateRecipeId,
    );

    if (!template) {
      setTemplateImportState({
        ...templateImportState,
        error: "Selected template recipe is no longer available.",
        message: undefined,
      });
      return;
    }

    if (readyFormValues.importedTemplates.some((imported) => imported.id === template.id)) {
      setTemplateImportState({
        ...templateImportState,
        error: "That template recipe is already imported.",
        message: undefined,
      });
      return;
    }

    const alreadyImportedTemplateIds = new Set(
      readyFormValues.importedTemplates.map((imported) => imported.id),
    );
    const nextSelectedTemplate = templateImportState.templates.find(
      (recipe) => recipe.id !== template.id && !alreadyImportedTemplateIds.has(recipe.id),
    );

    updateFormValues((values) => ({
      ...values,
      importedTemplates: [
        ...values.importedTemplates,
        {
          id: template.id,
          title: template.title,
          nutrition: template.nutrition,
          ingredientsExpanded: false,
          stepsExpanded: false,
        },
      ],
      ingredients: [
        ...(isBlankIngredientPlaceholder(values.ingredients) ? [] : values.ingredients),
        ...template.ingredients.map((ingredient) =>
          ingredientToFormRow(
            {
              ...ingredient,
              group: ingredient.group?.trim() || template.title,
            },
            template,
          ),
        ),
      ],
      steps: [
        ...(isBlankStepPlaceholder(values.steps) && template.steps.length > 0 ? [] : values.steps),
        ...[...template.steps]
          .sort((firstStep, secondStep) => firstStep.position - secondStep.position)
          .map((step) => createStepRow({ text: step.text }, template)),
      ],
      prepTimeMinutes:
        values.prepTimeMinutes === 0 ? (template.prepTimeMinutes ?? 0) : values.prepTimeMinutes,
      cookTimeMinutes:
        values.cookTimeMinutes === 0 ? (template.cookTimeMinutes ?? 0) : values.cookTimeMinutes,
      notes: values.notes.trim().length === 0 ? (template.notes ?? "") : values.notes,
      guidance: isEmptyGuidanceValues(values.guidance)
        ? guidanceToFormValues(template.guidance)
        : values.guidance,
      dietary: mergeTemplateAllergens(values.dietary, template.dietary),
    }));
    setTemplateImportState({
      ...templateImportState,
      error: undefined,
      message: `${template.title} imported as independent recipe rows.`,
    });
    setSelectedTemplateRecipeId(nextSelectedTemplate?.id ?? "");
  }

  function getIngredientRowNumber(row: IngredientFormRow) {
    return readyFormValues.ingredients.findIndex((ingredient) => ingredient.id === row.id) + 1;
  }

  function getStepRowNumber(row: StepFormRow) {
    return readyFormValues.steps.findIndex((step) => step.id === row.id) + 1;
  }

  function renderIngredientRow(ingredient: IngredientFormRow) {
    const index = getIngredientRowNumber(ingredient) - 1;

    return (
      <fieldset className="collection-row" key={ingredient.id}>
        <legend>Ingredient {index + 1}</legend>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input
              aria-label={`Ingredient ${index + 1} name`}
              value={ingredient.name}
              onChange={(event) => updateIngredient(ingredient.id, { name: event.target.value })}
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              aria-label={`Ingredient ${index + 1} quantity`}
              inputMode="decimal"
              placeholder="e.g. 250"
              type="text"
              value={ingredient.quantity}
              onChange={(event) =>
                updateIngredient(ingredient.id, { quantity: event.target.value })
              }
            />
          </label>
          <label>
            <span>Unit</span>
            <select
              aria-label={`Ingredient ${index + 1} unit`}
              value={ingredient.unit}
              onChange={(event) => updateIngredient(ingredient.id, { unit: event.target.value })}
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
              onChange={(event) => updateIngredient(ingredient.id, { group: event.target.value })}
            />
          </label>
          <label className="full-span">
            <span>Prep note</span>
            <input
              aria-label={`Ingredient ${index + 1} prep note`}
              placeholder="diced, divided, optional"
              value={ingredient.note}
              onChange={(event) => updateIngredient(ingredient.id, { note: event.target.value })}
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
            disabled={index === readyFormValues.ingredients.length - 1}
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
            disabled={readyFormValues.ingredients.length === 1}
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
    );
  }

  function renderStepRow(step: StepFormRow) {
    const index = getStepRowNumber(step) - 1;

    return (
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
            disabled={index === readyFormValues.steps.length - 1}
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
            disabled={readyFormValues.steps.length === 1}
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
    );
  }

  const importedTemplateIds = new Set(
    readyFormValues.importedTemplates.map((template) => template.id),
  );
  const availableTemplateRecipes =
    templateImportState.status === "ready"
      ? templateImportState.templates.filter((template) => !importedTemplateIds.has(template.id))
      : [];
  const manualIngredientRows = readyFormValues.ingredients.filter(
    (ingredient) => !ingredient.sourceTemplateId,
  );
  const importedIngredientGroups = readyFormValues.importedTemplates
    .map((template) => ({
      template,
      rows: readyFormValues.ingredients.filter(
        (ingredient) => ingredient.sourceTemplateId === template.id,
      ),
    }))
    .filter((group) => group.rows.length > 0);
  const manualStepRows = readyFormValues.steps.filter((step) => !step.sourceTemplateId);
  const importedStepGroups = readyFormValues.importedTemplates
    .map((template) => ({
      template,
      rows: readyFormValues.steps.filter((step) => step.sourceTemplateId === template.id),
    }))
    .filter((group) => group.rows.length > 0);
  const templateNutritionTotals = nutritionTotalsFromImportedTemplates(
    readyFormValues.importedTemplates,
  );
  const manualNutritionTotals = nutritionTotalsFromFormValues(readyFormValues.nutrition);
  const totalNutrition = addNutritionTotals(templateNutritionTotals, manualNutritionTotals);

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

        {manualIngredientRows.map((ingredient) => renderIngredientRow(ingredient))}
        {importedIngredientGroups.map((group) => (
          <details
            className="imported-template-section"
            key={group.template.id}
            open={group.template.ingredientsExpanded}
            onToggle={(event) =>
              updateImportedTemplateExpansion(
                group.template.id,
                "ingredientsExpanded",
                event.currentTarget.open,
              )
            }
          >
            <summary>
              <span>{group.template.title} ingredients</span>
              <span className="muted-text">{group.rows.length} copied rows</span>
            </summary>
            <div className="imported-template-section__body">
              {group.rows.map((ingredient) => renderIngredientRow(ingredient))}
            </div>
          </details>
        ))}
      </section>

      {mode === "create" ? (
        <section className="collection-editor" aria-labelledby="template-import-title">
          <div className="collection-editor__header">
            <div>
              <p className="section-kicker">Reusable prep</p>
              <h3 id="template-import-title">Start from template recipe</h3>
            </div>
          </div>

          {templateImportState.status === "loading" ? (
            <div className="state-view" role="status">
              <p className="state-view__title">Loading template recipes</p>
            </div>
          ) : null}

          {templateImportState.status === "error" ? (
            <ErrorView title="Template recipes unavailable" message={templateImportState.message} />
          ) : null}

          {templateImportState.status === "ready" && templateImportState.templates.length === 0 ? (
            <EmptyView
              title="No template recipes"
              message="Mark a saved recipe as a template before importing repeated ingredients and steps."
            />
          ) : null}

          {templateImportState.status === "ready" && availableTemplateRecipes.length > 0 ? (
            <div className="form-grid">
              <label>
                <span>Template recipe</span>
                <select
                  aria-label="Template recipe to import"
                  value={selectedTemplateRecipeId}
                  onChange={(event) => setSelectedTemplateRecipeId(event.target.value)}
                >
                  {availableTemplateRecipes.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() => importSelectedTemplateRecipe()}
              >
                Import template recipe
              </button>
            </div>
          ) : null}

          {templateImportState.status === "ready" &&
          templateImportState.templates.length > 0 &&
          availableTemplateRecipes.length === 0 ? (
            <p className="note-block">All available template recipes are already imported.</p>
          ) : null}

          {formState.values.importedTemplates.length > 0 ? (
            <ul className="compact-list" aria-label="Imported template recipes">
              {formState.values.importedTemplates.map((template) => (
                <li key={template.id}>
                  <span>
                    <strong>{template.title}</strong>{" "}
                    <span className="muted-text">
                      imported as an independent copy
                      {template.nutrition ? ` · ${nutritionSummaryText(template.nutrition)}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {templateImportState.status === "ready" && templateImportState.message ? (
            <p className="note-block" role="status">
              {templateImportState.message}
            </p>
          ) : null}

          {templateImportState.status === "ready" && templateImportState.error ? (
            <ErrorView title="Template import failed" message={templateImportState.error} />
          ) : null}
        </section>
      ) : null}

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

        {manualStepRows.map((step) => renderStepRow(step))}
        {importedStepGroups.map((group) => (
          <details
            className="imported-template-section"
            key={group.template.id}
            open={group.template.stepsExpanded}
            onToggle={(event) =>
              updateImportedTemplateExpansion(
                group.template.id,
                "stepsExpanded",
                event.currentTarget.open,
              )
            }
          >
            <summary>
              <span>{group.template.title} steps</span>
              <span className="muted-text">{group.rows.length} copied rows</span>
            </summary>
            <div className="imported-template-section__body">
              {group.rows.map((step) => renderStepRow(step))}
            </div>
          </details>
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
        <div className="allergen-table-wrap">
          <table className="allergen-table">
            <thead>
              <tr>
                <th scope="col">Allergen</th>
                <th scope="col">Contains</th>
              </tr>
            </thead>
            <tbody>
              {allergenOptions.map((option) => {
                const allergen = formState.values.dietary.allergens[option.value];

                return (
                  <tr key={option.value}>
                    <th scope="row">{option.label}</th>
                    <td>
                      <input
                        aria-label={`${option.label} allergen`}
                        checked={allergen.status === "contains"}
                        type="checkbox"
                        onChange={(event) =>
                          updateAllergen(option.value, {
                            status: event.target.checked ? "contains" : "unverified",
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          Optional manual estimates for the whole recipe. These are not clinical recommendations.
        </p>
        {formState.values.importedTemplates.length > 0 ? (
          <div className="template-nutrition-panel" aria-label="Template nutrition subtotal">
            <h4>Template nutrition</h4>
            <ul className="compact-list">
              {formState.values.importedTemplates.map((template) => (
                <li key={template.id}>
                  <span>
                    <strong>{template.title}</strong>{" "}
                    <span className="muted-text">
                      {template.nutrition
                        ? nutritionSummaryText(template.nutrition)
                        : "No manual nutrition on this template."}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
                </div>
              </fieldset>
            );
          })}
        </div>
        <div className="nutrition-summary-wrap">
          <table className="nutrition-summary-table" aria-label="Nutrition totals">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">From templates</th>
                <th scope="col">Added now</th>
                <th scope="col">Total</th>
                <th scope="col">Per serving</th>
              </tr>
            </thead>
            <tbody>
              {nutritionMetricDefinitions.map((definition) => {
                const templateAmount = templateNutritionTotals[definition.metric];
                const manualAmount = manualNutritionTotals[definition.metric];
                const totalAmount = totalNutrition[definition.metric];
                const perServingAmount =
                  formState.values.baseServings > 0
                    ? totalAmount / formState.values.baseServings
                    : 0;

                return (
                  <tr key={definition.metric}>
                    <th scope="row">{definition.label}</th>
                    <td>
                      {formatNutritionAmount(templateAmount)} {definition.unit}
                    </td>
                    <td>
                      {formatNutritionAmount(manualAmount)} {definition.unit}
                    </td>
                    <td>
                      {formatNutritionAmount(totalAmount)} {definition.unit}
                    </td>
                    <td>
                      {formatNutritionAmount(perServingAmount)} {definition.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        <label className="checkbox-row">
          <input
            aria-label="Template recipe"
            checked={formState.values.isTemplate}
            onChange={(event) => updateValues({ isTemplate: event.target.checked })}
            type="checkbox"
          />
          Template recipe?
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
    importedTemplates: [],
    isFavorite: false,
    isTemplate: false,
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
        ? recipe.ingredients.map((ingredient) => ingredientToFormRow(ingredient))
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
    importedTemplates: [],
    isFavorite: recipe.isFavorite,
    isTemplate: Boolean(recipe.isTemplate),
    photoLocalId: recipe.photo?.localId ?? "",
  };
}

function ingredientToFormRow(ingredient: Ingredient, sourceTemplate?: Recipe): IngredientFormRow {
  return createIngredientRow({
    name: ingredient.name,
    quantity: String(ingredient.quantity),
    unit: ingredient.unit,
    group: ingredient.group ?? "",
    note: ingredient.note ?? "",
    sourceTemplateId: sourceTemplate?.id,
    sourceTemplateTitle: sourceTemplate?.title,
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
      quantity: Number(ingredient.quantity),
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
    nutrition: nutritionFromFormValues(values.nutrition, values.importedTemplates),
    isFavorite: values.isFavorite,
    isTemplate: values.isTemplate,
    photo:
      values.photoLocalId.trim().length > 0 ? { localId: values.photoLocalId.trim() } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function validateRecipeFormValues(values: RecipeFormValues) {
  const invalidIngredientIndex = values.ingredients.findIndex((ingredient) => {
    const parsedQuantity = Number(ingredient.quantity);
    return (
      ingredient.quantity.trim().length === 0 ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    );
  });

  if (invalidIngredientIndex >= 0) {
    return `Ingredient ${invalidIngredientIndex + 1} quantity must be greater than zero.`;
  }

  return undefined;
}

function createIngredientRow(
  values: Partial<Omit<IngredientFormRow, "id">> = {},
): IngredientFormRow {
  return {
    id: createRowId("ingredient"),
    name: values.name ?? "",
    quantity: values.quantity ?? "",
    unit: values.unit ?? "g",
    group: values.group ?? "",
    note: values.note ?? "",
    sourceTemplateId: values.sourceTemplateId,
    sourceTemplateTitle: values.sourceTemplateTitle,
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
  };
}

function createEmptyNutritionValues(): NutritionFormValues {
  return Object.fromEntries(
    nutritionMetricDefinitions.map((definition) => [
      definition.metric,
      {
        amount: "",
      },
    ]),
  ) as NutritionFormValues;
}

function createEmptyAllergenValues(): Record<BigNineAllergen, AllergenFormValue> {
  return Object.fromEntries(
    allergenOptions.map((option) => [
      option.value,
      {
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

function isEmptyGuidanceValues(guidance: PracticalGuidanceFormValues) {
  return Object.values(guidance).every((value) => value.trim().length === 0);
}

function dietaryToFormValues(dietary: RecipeDietaryMetadata | undefined): DietaryFormValues {
  const allergens = createEmptyAllergenValues();

  dietary?.allergens.forEach((flag) => {
    allergens[flag.allergen] = {
      status: flag.status === "contains" ? "contains" : "unverified",
    };
  });

  return {
    allergens,
  };
}

function dietaryFromFormValues(dietary: DietaryFormValues): RecipeDietaryMetadata | undefined {
  const allergens = allergenOptions
    .filter((option) => dietary.allergens[option.value].status === "contains")
    .map((option) => ({
      allergen: option.value,
      status: "contains" as const,
    }));

  return allergens.length > 0
    ? {
        allergens,
        dietaryTags: [],
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
    };
  });

  return values;
}

function nutritionFromFormValues(
  nutrition: NutritionFormValues,
  importedTemplates: ReadonlyArray<ImportedTemplateFormValue>,
): RecipeNutritionEstimate | undefined {
  const estimate: RecipeNutritionEstimate = {};
  const templateTotals = nutritionTotalsFromImportedTemplates(importedTemplates);
  const manualTotals = nutritionTotalsFromFormValues(nutrition);
  const totalNutrition = addNutritionTotals(templateTotals, manualTotals);

  nutritionMetricDefinitions.forEach((definition) => {
    const value = nutrition[definition.metric];
    const totalAmount = totalNutrition[definition.metric];

    if (value.amount.trim().length === 0 && templateTotals[definition.metric] === 0) {
      return;
    }

    estimate[definition.metric] = {
      amount: totalAmount,
      unit: definition.unit,
    };
  });

  return Object.keys(estimate).length > 0 ? estimate : undefined;
}

type NutritionTotals = Record<NutritionMetric, number>;

function createEmptyNutritionTotals(): NutritionTotals {
  return Object.fromEntries(
    nutritionMetricDefinitions.map((definition) => [definition.metric, 0]),
  ) as NutritionTotals;
}

function nutritionTotalsFromImportedTemplates(
  importedTemplates: ReadonlyArray<ImportedTemplateFormValue>,
): NutritionTotals {
  return importedTemplates.reduce<NutritionTotals>((totals, template) => {
    nutritionMetricDefinitions.forEach((definition) => {
      totals[definition.metric] += template.nutrition?.[definition.metric]?.amount ?? 0;
    });

    return totals;
  }, createEmptyNutritionTotals());
}

function nutritionTotalsFromFormValues(nutrition: NutritionFormValues): NutritionTotals {
  const totals = createEmptyNutritionTotals();

  nutritionMetricDefinitions.forEach((definition) => {
    const amount = Number(nutrition[definition.metric].amount);
    totals[definition.metric] = Number.isFinite(amount) && amount > 0 ? amount : 0;
  });

  return totals;
}

function addNutritionTotals(firstTotals: NutritionTotals, secondTotals: NutritionTotals) {
  return Object.fromEntries(
    nutritionMetricDefinitions.map((definition) => [
      definition.metric,
      firstTotals[definition.metric] + secondTotals[definition.metric],
    ]),
  ) as NutritionTotals;
}

function nutritionSummaryText(nutrition: RecipeNutritionEstimate) {
  const summary = nutritionMetricDefinitions
    .flatMap((definition) => {
      const value = nutrition[definition.metric];

      return value
        ? [`${definition.label} ${formatNutritionAmount(value.amount)} ${definition.unit}`]
        : [];
    })
    .join(", ");

  return summary || "No manual nutrition on this template.";
}

function mergeTemplateAllergens(
  dietary: DietaryFormValues,
  templateDietary: RecipeDietaryMetadata | undefined,
): DietaryFormValues {
  if (!templateDietary) {
    return dietary;
  }

  const allergens = { ...dietary.allergens };

  templateDietary.allergens.forEach((flag) => {
    if (flag.status === "contains") {
      allergens[flag.allergen] = { status: "contains" };
    }
  });

  return {
    allergens,
  };
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

function createStepRow(
  values: Partial<Omit<StepFormRow, "id">> = {},
  sourceTemplate?: Recipe,
): StepFormRow {
  return {
    id: createRowId("step"),
    text: values.text ?? "",
    sourceTemplateId: values.sourceTemplateId ?? sourceTemplate?.id,
    sourceTemplateTitle: values.sourceTemplateTitle ?? sourceTemplate?.title,
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

function isBlankIngredientPlaceholder(rows: ReadonlyArray<IngredientFormRow>) {
  return (
    rows.length === 1 &&
    rows[0].name.trim().length === 0 &&
    rows[0].quantity.trim().length === 0 &&
    rows[0].group.trim().length === 0 &&
    rows[0].note.trim().length === 0
  );
}

function isBlankStepPlaceholder(rows: ReadonlyArray<StepFormRow>) {
  return rows.length === 1 && rows[0].text.trim().length === 0;
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
