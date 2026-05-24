import { useEffect, useState } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { CookSession, CookSessionUseCases } from "../application/cookSessionUseCases";
import type { RecipeExportUseCases } from "../application/recipeExportUseCases";
import type { RecipeUseCases } from "../application/recipeUseCases";
import {
  formatNutritionAmount,
  getRecipeNutritionSummary,
  nutritionStatusLabel,
} from "../domain/nutrition";
import { formatScaledQuantity, type ScaledIngredient } from "../domain/portionScaling";
import type {
  BigNineAllergen,
  Recipe,
  RecipeDietaryMetadata,
  RecipePracticalGuidance,
  WarningVerificationStatus,
} from "../domain/recipe";

type RecipeDetailScreenProps = {
  recipeId: string;
  recipeUseCases: RecipeUseCases;
  recipeExportUseCases: RecipeExportUseCases;
  cookSessionUseCases: CookSessionUseCases;
  onBack: () => void;
  onEdit: (recipeId: string) => void;
};

type DetailState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; recipe: Recipe; scaledIngredients: ReadonlyArray<ScaledIngredient> };

type IngredientGroup = {
  name: string;
  ingredients: ReadonlyArray<ScaledIngredient>;
};

export function RecipeDetailScreen({
  recipeId,
  cookSessionUseCases,
  recipeExportUseCases,
  recipeUseCases,
  onBack,
  onEdit,
}: RecipeDetailScreenProps) {
  const [targetServings, setTargetServings] = useState(2);
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });
  const [shareState, setShareState] = useState<
    | { status: "idle" }
    | { status: "success"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [cookModeActive, setCookModeActive] = useState(false);
  const [cookSession, setCookSession] = useState<CookSession | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      setDetailState({ status: "loading" });
      const recipeResult = await recipeUseCases.getRecipeDetails(recipeId);

      if (cancelled) {
        return;
      }

      if (!recipeResult.ok) {
        setDetailState(
          recipeResult.error.code === "not-found"
            ? { status: "missing" }
            : { status: "error", message: recipeResult.error.message },
        );
        return;
      }

      setTargetServings(recipeResult.value.baseServings);
      const scaledResult = await recipeUseCases.previewPortions(
        recipeId,
        recipeResult.value.baseServings,
      );
      const sessionResult = await cookSessionUseCases.loadSession(recipeId);

      if (cancelled) {
        return;
      }

      if (!scaledResult.ok) {
        setDetailState({ status: "error", message: scaledResult.error.message });
        return;
      }

      setDetailState({
        status: "ready",
        recipe: recipeResult.value,
        scaledIngredients: scaledResult.value,
      });
      setCookSession(
        sessionResult.ok && sessionResult.value
          ? sessionResult.value
          : createDefaultCookSession(recipeResult.value),
      );
    }

    void loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [cookSessionUseCases, recipeId, recipeUseCases]);

  async function updateServings(nextServings: number) {
    setTargetServings(nextServings);
    setShareState({ status: "idle" });

    if (detailState.status !== "ready") {
      return;
    }

    const result = await recipeUseCases.previewPortions(recipeId, nextServings);

    if (!result.ok) {
      setDetailState({ status: "error", message: result.error.message });
      return;
    }

    setDetailState({
      ...detailState,
      scaledIngredients: result.value,
    });
  }

  async function shareRecipe() {
    const result = await recipeExportUseCases.shareRecipe(recipeId, targetServings);

    if (!result.ok) {
      setShareState({ status: "error", message: result.error.message });
      return;
    }

    setShareState({ status: "success", message: "Recipe text export is ready to share." });
  }

  async function saveCookSession(nextSession: CookSession) {
    setCookSession(nextSession);
    await cookSessionUseCases.saveSession(nextSession);
  }

  async function moveCookStep(direction: -1 | 1) {
    if (detailState.status !== "ready" || !cookSession) {
      return;
    }

    const steps = orderedRecipeSteps(detailState.recipe);
    const currentIndex = currentCookStepIndex(steps, cookSession);
    const nextStep = steps[currentIndex + direction];

    if (!nextStep) {
      return;
    }

    await saveCookSession({
      ...cookSession,
      currentStepPosition: nextStep.position,
      updatedAt: new Date().toISOString(),
    });
  }

  async function toggleCookStepComplete(stepPosition: number, completed: boolean) {
    if (!cookSession) {
      return;
    }

    const completedStepPositions = completed
      ? Array.from(new Set([...cookSession.completedStepPositions, stepPosition]))
      : cookSession.completedStepPositions.filter((position) => position !== stepPosition);

    await saveCookSession({
      ...cookSession,
      completedStepPositions,
      updatedAt: new Date().toISOString(),
    });
  }

  if (detailState.status === "loading") {
    return <LoadingView title="Loading recipe" />;
  }

  if (detailState.status === "missing") {
    return (
      <EmptyView
        title="Recipe not found"
        message="The selected recipe is no longer available."
        action={{ label: "Back to recipes", onClick: onBack }}
      />
    );
  }

  if (detailState.status === "error") {
    return (
      <ErrorView
        title="Recipe unavailable"
        message={detailState.message}
        action={{ label: "Back to recipes", onClick: onBack }}
      />
    );
  }

  const orderedSteps = orderedRecipeSteps(detailState.recipe);
  const currentStepIndex = cookSession ? currentCookStepIndex(orderedSteps, cookSession) : 0;
  const currentStep = orderedSteps[currentStepIndex];

  if (cookModeActive && cookSession && currentStep) {
    const isComplete = cookSession.completedStepPositions.includes(currentStep.position);

    return (
      <section className="screen-stack cook-mode" aria-labelledby="cook-mode-title">
        <div className="screen-header">
          <div>
            <p className="section-kicker">Cook mode</p>
            <h2 id="cook-mode-title">{detailState.recipe.title}</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setCookModeActive(false)}
          >
            Exit cook mode
          </button>
        </div>

        <p className="pill">
          Step {currentStepIndex + 1} of {orderedSteps.length}
        </p>
        <article className="cook-step-card" aria-label={`Step ${currentStepIndex + 1}`}>
          <p>{currentStep.text}</p>
        </article>

        <label className="checkbox-row">
          <input
            checked={isComplete}
            onChange={(event) =>
              void toggleCookStepComplete(currentStep.position, event.target.checked)
            }
            type="checkbox"
          />
          Mark step complete
        </label>

        <div className="action-row">
          <button
            className="secondary-button"
            disabled={currentStepIndex === 0}
            type="button"
            onClick={() => void moveCookStep(-1)}
          >
            Previous step
          </button>
          <button
            className="primary-button"
            disabled={currentStepIndex === orderedSteps.length - 1}
            type="button"
            onClick={() => void moveCookStep(1)}
          >
            Next step
          </button>
        </div>
      </section>
    );
  }

  const guidanceItems = guidanceEntries(detailState.recipe.guidance);
  const dietaryItems = dietaryEntries(detailState.recipe.dietary);
  const nutritionItems = getRecipeNutritionSummary(detailState.recipe);
  const ingredientGroups = groupScaledIngredients(detailState.scaledIngredients);

  return (
    <section className="screen-stack" aria-labelledby="recipe-detail-title">
      <div className="screen-header">
        <button className="secondary-button" type="button" onClick={onBack}>
          Back
        </button>
        <button className="secondary-button" type="button" onClick={() => onEdit(recipeId)}>
          Edit
        </button>
      </div>

      <div>
        <p className="section-kicker">{detailState.recipe.categoryPath.join(" / ") || "Recipe"}</p>
        <h2 id="recipe-detail-title">{detailState.recipe.title}</h2>
        <p>{detailState.recipe.description}</p>
      </div>

      <label>
        <span>Target servings</span>
        <input
          aria-label="Target servings"
          min="1"
          type="number"
          value={targetServings}
          onChange={(event) => void updateServings(Number(event.target.value))}
        />
      </label>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={() => setCookModeActive(true)}>
          Cook mode
        </button>
        <button className="secondary-button" type="button" onClick={() => void shareRecipe()}>
          Export recipe
        </button>
      </div>

      {shareState.status === "success" ? (
        <p className="note-block" role="status">
          {shareState.message}
        </p>
      ) : null}

      {shareState.status === "error" ? (
        <ErrorView title="Export unavailable" message={shareState.message} />
      ) : null}

      <section aria-labelledby="ingredients-title">
        <h3 id="ingredients-title">Ingredients</h3>
        <div className="ingredient-groups">
          {ingredientGroups.map((group) => (
            <section key={group.name} aria-label={`${group.name} ingredients`}>
              <h4>{group.name}</h4>
              <ul className="ingredient-list">
                {group.ingredients.map((ingredient) => (
                  <li key={`${group.name}-${ingredient.name}-${ingredient.unit}`}>
                    <strong>
                      {formatScaledQuantity(ingredient.scaledQuantity)} {ingredient.unit}
                    </strong>{" "}
                    {ingredient.name}
                    {ingredient.note ? (
                      <span className="muted-text">, {ingredient.note}</span>
                    ) : null}
                    <span className="muted-text">
                      {" "}
                      (base {formatScaledQuantity(ingredient.originalQuantity)} {ingredient.unit})
                    </span>
                    {ingredient.guidance ? (
                      <span className="muted-text"> - {ingredient.guidance}</span>
                    ) : null}
                    {ingredient.warning ? (
                      <span className="muted-text"> - {ingredient.warning}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps-title">
        <h3 id="steps-title">Steps</h3>
        <ol className="step-list">
          {detailState.recipe.steps.map((step) => (
            <li key={step.position}>{step.text}</li>
          ))}
        </ol>
      </section>

      {detailState.recipe.notes ? <p className="note-block">{detailState.recipe.notes}</p> : null}

      {guidanceItems.length > 0 ? (
        <section aria-labelledby="guidance-title">
          <h3 id="guidance-title">Storage and leftovers</h3>
          <p className="muted-text">
            User-entered notes only. Review freshness and safety before serving.
          </p>
          <dl className="guidance-list">
            {guidanceItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {dietaryItems.length > 0 ? (
        <section aria-labelledby="dietary-title">
          <h3 id="dietary-title">Allergen and dietary notes</h3>
          <p className="muted-text">
            User-entered warnings only. This does not guarantee a recipe is safe for an allergy or
            diet.
          </p>
          <ul className="compact-list">
            {dietaryItems.map((item) => (
              <li key={`${item.label}-${item.status}`}>
                <span>
                  <strong>{item.label}</strong>{" "}
                  <span className="muted-text">({verificationStatusLabel(item.status)})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {nutritionItems.length > 0 ? (
        <section aria-labelledby="nutrition-title">
          <h3 id="nutrition-title">Nutrition estimate</h3>
          <p className="muted-text">Manual or estimated values only. Not medical or diet advice.</p>
          <ul className="compact-list">
            {nutritionItems.map((item) => (
              <li key={item.metric}>
                <span>
                  <strong>{item.label}</strong> {formatNutritionAmount(item.recipeAmount)}{" "}
                  {item.unit} per recipe / {formatNutritionAmount(item.perServingAmount)}{" "}
                  {item.unit} per serving
                  <span className="muted-text">
                    {" "}
                    ({nutritionStatusLabel(item.status)}, {item.source})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function groupScaledIngredients(
  ingredients: ReadonlyArray<ScaledIngredient>,
): ReadonlyArray<IngredientGroup> {
  const groups = new Map<string, ScaledIngredient[]>();

  ingredients.forEach((ingredient) => {
    const groupName = ingredient.group?.trim() || "Ingredients";
    groups.set(groupName, [...(groups.get(groupName) ?? []), ingredient]);
  });

  return Array.from(groups.entries()).map(([name, groupedIngredients]) => ({
    name,
    ingredients: groupedIngredients,
  }));
}

function createDefaultCookSession(recipe: Recipe): CookSession {
  return {
    recipeId: recipe.id,
    currentStepPosition: orderedRecipeSteps(recipe)[0]?.position ?? 1,
    completedStepPositions: [],
    updatedAt: new Date().toISOString(),
  };
}

function orderedRecipeSteps(recipe: Recipe) {
  return [...recipe.steps].sort(
    (firstStep, secondStep) => firstStep.position - secondStep.position,
  );
}

function currentCookStepIndex(
  steps: ReturnType<typeof orderedRecipeSteps>,
  cookSession: CookSession,
) {
  const stepIndex = steps.findIndex((step) => step.position === cookSession.currentStepPosition);
  return stepIndex >= 0 ? stepIndex : 0;
}

function guidanceEntries(guidance: RecipePracticalGuidance | undefined) {
  return [
    { label: "Prep ahead", value: guidance?.prepAhead },
    { label: "Refrigerator storage", value: guidance?.refrigeratorStorage },
    { label: "Freezer storage", value: guidance?.freezerStorage },
    { label: "Reheating", value: guidance?.reheating },
    { label: "Holding", value: guidance?.holding },
    { label: "Leftovers", value: guidance?.leftoverUse },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
}

const allergenLabels: Record<BigNineAllergen, string> = {
  milk: "Contains milk",
  eggs: "Contains eggs",
  fish: "Contains fish",
  crustaceanShellfish: "Contains crustacean shellfish",
  treeNuts: "Contains tree nuts",
  peanuts: "Contains peanuts",
  wheat: "Contains wheat",
  soybeans: "Contains soybeans",
  sesame: "Contains sesame",
};

function dietaryEntries(dietary: RecipeDietaryMetadata | undefined) {
  if (!dietary) {
    return [];
  }

  return [
    ...dietary.allergens.map((flag) => ({
      label: allergenLabels[flag.allergen],
      status: flag.status,
    })),
    ...dietary.dietaryTags.map((flag) => ({
      label: flag.label,
      status: flag.status,
    })),
  ];
}

function verificationStatusLabel(status: WarningVerificationStatus) {
  if (status === "userVerified") {
    return "User verified";
  }

  return status === "estimated" ? "Estimated" : "Unverified";
}
