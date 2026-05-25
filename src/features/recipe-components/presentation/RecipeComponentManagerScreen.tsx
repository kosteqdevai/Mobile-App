import { useEffect, useState } from "react";

import { ConfirmActionButton } from "../../../core/presentation/ConfirmActionButton";
import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import { ingredientUnitOptions } from "../../recipes/domain/ingredientUnits";
import type { RecipeComponentUseCases } from "../application/recipeComponentUseCases";
import type { RecipeComponent, RecipeComponentInput } from "../domain/recipeComponent";

type RecipeComponentManagerScreenProps = {
  recipeComponentUseCases: RecipeComponentUseCases;
  onChanged: () => void;
};

type ComponentState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; components: ReadonlyArray<RecipeComponent>; error?: string };

type IngredientFormRow = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  group: string;
  note: string;
};

type StepFormRow = {
  id: string;
  text: string;
};

type ComponentFormValues = {
  editingId?: string;
  sourceRecipeId?: string;
  createdAt?: string;
  name: string;
  baseServings: number;
  ingredients: IngredientFormRow[];
  steps: StepFormRow[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  notes: string;
};

const componentUnitOptions = ingredientUnitOptions;

let componentRowIdSequence = 0;

export function RecipeComponentManagerScreen({
  recipeComponentUseCases,
  onChanged,
}: RecipeComponentManagerScreenProps) {
  const [componentState, setComponentState] = useState<ComponentState>({ status: "loading" });
  const [formValues, setFormValues] = useState<ComponentFormValues>(() => createEmptyFormValues());

  useEffect(() => {
    void loadComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeComponentUseCases]);

  async function loadComponents() {
    setComponentState({ status: "loading" });
    const result = await recipeComponentUseCases.listComponents();

    if (!result.ok) {
      setComponentState({ status: "error", message: result.error.message });
      return;
    }

    setComponentState({ status: "ready", components: result.value });
  }

  async function saveComponent() {
    if (componentState.status !== "ready") {
      return;
    }

    const validationMessage = validateComponentFormValues(formValues);

    if (validationMessage) {
      setComponentState({ ...componentState, error: validationMessage });
      return;
    }

    const input = formValuesToInput(formValues);
    const result = formValues.editingId
      ? await recipeComponentUseCases.updateComponent(input)
      : await recipeComponentUseCases.createComponent(input);

    if (!result.ok) {
      setComponentState({ ...componentState, error: result.error.message });
      return;
    }

    setFormValues(createEmptyFormValues());
    onChanged();
    await loadComponents();
  }

  async function deleteComponent(componentId: string) {
    if (componentState.status !== "ready") {
      return;
    }

    const result = await recipeComponentUseCases.deleteComponent(componentId);

    if (!result.ok) {
      setComponentState({ ...componentState, error: result.error.message });
      return;
    }

    if (formValues.editingId === componentId) {
      setFormValues(createEmptyFormValues());
    }

    onChanged();
    await loadComponents();
  }

  function updateIngredient(rowId: string, nextValues: Partial<IngredientFormRow>) {
    setFormValues((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.id === rowId ? { ...ingredient, ...nextValues } : ingredient,
      ),
    }));
  }

  function updateStep(rowId: string, nextValues: Partial<StepFormRow>) {
    setFormValues((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === rowId ? { ...step, ...nextValues } : step)),
    }));
  }

  if (componentState.status === "loading") {
    return <LoadingView title="Loading components" />;
  }

  if (componentState.status === "error") {
    return (
      <ErrorView
        title="Components unavailable"
        message={componentState.message}
        action={{ label: "Try again", onClick: () => void loadComponents() }}
      />
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="components-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Reusable prep</p>
          <h2 id="components-title">Components</h2>
        </div>
      </div>

      {componentState.error ? (
        <ErrorView title="Component action failed" message={componentState.error} />
      ) : null}

      {componentState.components.length === 0 ? (
        <EmptyView
          title="No components yet"
          message="Save a repeated dough, sauce, filling, or prep block to reuse it in recipes."
        />
      ) : (
        <div className="recipe-grid" aria-label="Saved recipe components">
          {componentState.components.map((component) => (
            <article className="recipe-card" key={component.id}>
              <h3>{component.name}</h3>
              <p className="muted-text">
                {component.ingredients.length} ingredients · {component.steps.length} steps
              </p>
              {component.notes ? <p>{component.notes}</p> : null}
              <div className="action-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setFormValues(componentToFormValues(component))}
                >
                  Edit {component.name}
                </button>
                <ConfirmActionButton
                  idleLabel={`Delete ${component.name}`}
                  confirmLabel={`Confirm delete ${component.name}`}
                  onConfirm={() => void deleteComponent(component.id)}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="collection-editor" aria-labelledby="component-form-title">
        <div className="collection-editor__header">
          <div>
            <p className="section-kicker">
              {formValues.editingId ? "Edit component" : "New component"}
            </p>
            <h3 id="component-form-title">
              {formValues.editingId ? "Update component" : "Create component"}
            </h3>
          </div>
          {formValues.editingId ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setFormValues(createEmptyFormValues())}
            >
              New component
            </button>
          ) : null}
        </div>

        <div className="form-grid">
          <label>
            <span>Name</span>
            <input
              aria-label="Component name"
              value={formValues.name}
              onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
            />
          </label>
          <label>
            <span>Base servings</span>
            <input
              aria-label="Component base servings"
              min="1"
              type="number"
              value={formValues.baseServings}
              onChange={(event) =>
                setFormValues({ ...formValues, baseServings: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Prep minutes</span>
            <input
              aria-label="Component prep minutes"
              min="0"
              type="number"
              value={formValues.prepTimeMinutes}
              onChange={(event) =>
                setFormValues({ ...formValues, prepTimeMinutes: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Cook minutes</span>
            <input
              aria-label="Component cook minutes"
              min="0"
              type="number"
              value={formValues.cookTimeMinutes}
              onChange={(event) =>
                setFormValues({ ...formValues, cookTimeMinutes: Number(event.target.value) })
              }
            />
          </label>
          <label className="full-span">
            <span>Notes</span>
            <textarea
              aria-label="Component notes"
              value={formValues.notes}
              onChange={(event) => setFormValues({ ...formValues, notes: event.target.value })}
            />
          </label>
        </div>

        <section aria-labelledby="component-ingredients-title">
          <div className="collection-editor__header">
            <h4 id="component-ingredients-title">Ingredients</h4>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setFormValues({
                  ...formValues,
                  ingredients: [...formValues.ingredients, createIngredientRow()],
                })
              }
            >
              Add component ingredient
            </button>
          </div>

          {formValues.ingredients.map((ingredient, index) => (
            <fieldset className="collection-row" key={ingredient.id}>
              <legend>Component ingredient {index + 1}</legend>
              <div className="form-grid">
                <label>
                  <span>Name</span>
                  <input
                    aria-label={`Component ingredient ${index + 1} name`}
                    value={ingredient.name}
                    onChange={(event) =>
                      updateIngredient(ingredient.id, { name: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Quantity</span>
                  <input
                    aria-label={`Component ingredient ${index + 1} quantity`}
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
                    aria-label={`Component ingredient ${index + 1} unit`}
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
                    aria-label={`Component ingredient ${index + 1} group`}
                    value={ingredient.group}
                    onChange={(event) =>
                      updateIngredient(ingredient.id, { group: event.target.value })
                    }
                  />
                </label>
                <label className="full-span">
                  <span>Prep note</span>
                  <input
                    aria-label={`Component ingredient ${index + 1} prep note`}
                    value={ingredient.note}
                    onChange={(event) =>
                      updateIngredient(ingredient.id, { note: event.target.value })
                    }
                  />
                </label>
              </div>
              <button
                className="secondary-button"
                disabled={formValues.ingredients.length === 1}
                type="button"
                onClick={() =>
                  setFormValues({
                    ...formValues,
                    ingredients: removeRow(
                      formValues.ingredients,
                      ingredient.id,
                      createIngredientRow,
                    ),
                  })
                }
              >
                Remove component ingredient
              </button>
            </fieldset>
          ))}
        </section>

        <section aria-labelledby="component-steps-title">
          <div className="collection-editor__header">
            <h4 id="component-steps-title">Steps</h4>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setFormValues({ ...formValues, steps: [...formValues.steps, createStepRow()] })
              }
            >
              Add component step
            </button>
          </div>

          {formValues.steps.length === 0 ? (
            <p className="muted-text">Steps are optional for ingredient-only components.</p>
          ) : null}

          {formValues.steps.map((step, index) => (
            <fieldset className="collection-row" key={step.id}>
              <legend>Component step {index + 1}</legend>
              <label>
                <span>Instruction</span>
                <textarea
                  aria-label={`Component step ${index + 1} text`}
                  value={step.text}
                  onChange={(event) => updateStep(step.id, { text: event.target.value })}
                />
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setFormValues({
                    ...formValues,
                    steps: formValues.steps.filter((candidate) => candidate.id !== step.id),
                  })
                }
              >
                Remove component step
              </button>
            </fieldset>
          ))}
        </section>

        <button className="primary-button" type="button" onClick={() => void saveComponent()}>
          {formValues.editingId ? "Save component changes" : "Save component"}
        </button>
      </section>
    </section>
  );
}

function createEmptyFormValues(): ComponentFormValues {
  return {
    name: "",
    baseServings: 2,
    ingredients: [createIngredientRow()],
    steps: [createStepRow()],
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    notes: "",
  };
}

function componentToFormValues(component: RecipeComponent): ComponentFormValues {
  return {
    editingId: component.id,
    sourceRecipeId: component.sourceRecipeId,
    createdAt: component.createdAt,
    name: component.name,
    baseServings: component.baseServings,
    ingredients:
      component.ingredients.length > 0
        ? component.ingredients.map((ingredient) =>
            createIngredientRow({
              name: ingredient.name,
              quantity: String(ingredient.quantity),
              unit: ingredient.unit,
              group: ingredient.group ?? "",
              note: ingredient.note ?? "",
            }),
          )
        : [createIngredientRow()],
    steps: component.steps.map((step) => createStepRow({ text: step.text })),
    prepTimeMinutes: component.prepTimeMinutes ?? 0,
    cookTimeMinutes: component.cookTimeMinutes ?? 0,
    notes: component.notes ?? "",
  };
}

function formValuesToInput(values: ComponentFormValues): RecipeComponentInput {
  const now = new Date().toISOString();

  return {
    id: values.editingId ?? `component-${Date.now()}`,
    name: values.name,
    baseServings: values.baseServings,
    ingredients: values.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      group: optionalText(ingredient.group),
      note: optionalText(ingredient.note),
    })),
    steps: values.steps.map((step, index) => ({
      position: index + 1,
      text: step.text,
    })),
    prepTimeMinutes: values.prepTimeMinutes,
    cookTimeMinutes: values.cookTimeMinutes,
    notes: values.notes,
    sourceRecipeId: values.sourceRecipeId,
    createdAt: values.createdAt ?? now,
    updatedAt: now,
  };
}

function validateComponentFormValues(values: ComponentFormValues) {
  const invalidIngredientIndex = values.ingredients.findIndex((ingredient) => {
    const parsedQuantity = Number(ingredient.quantity);
    return (
      ingredient.quantity.trim().length === 0 ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    );
  });

  if (invalidIngredientIndex >= 0) {
    return `Component ingredient ${invalidIngredientIndex + 1} quantity must be greater than zero.`;
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
  };
}

function createStepRow(values: Partial<Omit<StepFormRow, "id">> = {}): StepFormRow {
  return {
    id: createRowId("step"),
    text: values.text ?? "",
  };
}

function createRowId(prefix: string) {
  componentRowIdSequence += 1;
  return `${prefix}-${componentRowIdSequence}`;
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

  if (normalizedUnit.length > 0 && !componentUnitOptions.includes(normalizedUnit)) {
    return [normalizedUnit, ...componentUnitOptions];
  }

  return componentUnitOptions;
}

function optionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}
