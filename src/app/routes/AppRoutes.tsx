import { useAppDependencies } from "../providers/useAppDependencies";
import { useState } from "react";
import comeroLogo from "../../assets/comero-logo.png";
import { CookbookManagerScreen } from "../../features/cookbooks/presentation/CookbookManagerScreen";
import { PlannerScreen } from "../../features/planner/presentation/PlannerScreen";
import { RecipeDetailScreen } from "../../features/recipes/presentation/RecipeDetailScreen";
import { RecipeFormScreen } from "../../features/recipes/presentation/RecipeFormScreen";
import { RecipeListScreen } from "../../features/recipes/presentation/RecipeListScreen";
import { RecipeTransferScreen } from "../../features/recipes/presentation/RecipeTransferScreen";
import { initialRecipeTransferScreenState } from "../../features/recipes/presentation/RecipeTransferState";
import type { AppRoute } from "./routes";

export function AppRoutes() {
  const {
    appConfig,
    cookSessionUseCases,
    cookbookUseCases,
    mealPlanUseCases,
    recipeExportUseCases,
    recipePackFileUseCases,
    recipePackUseCases,
    recipeUseCases,
  } = useAppDependencies();
  const [route, setRoute] = useState<AppRoute>({ name: "recipes" });
  const [revision, setRevision] = useState(0);
  const [recipeTransferState, setRecipeTransferState] = useState(initialRecipeTransferScreenState);
  const appShellLabel = `${appConfig.name} app shell`;

  function markChanged() {
    setRevision((current) => current + 1);
    setRecipeTransferState((current) =>
      current.exportState.status === "idle"
        ? current
        : {
            ...current,
            exportState: { status: "idle" },
          },
    );
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <header className="app-header">
        <div className="app-brand">
          <img className="app-brand__logo" src={comeroLogo} alt={`${appConfig.name} logo`} />
          <div>
            <p className="app-shell__eyebrow">{appConfig.stage}</p>
            <h1 id="app-title">{appConfig.name}</h1>
            <p className="app-shell__summary">Personal cookbook</p>
          </div>
        </div>
        <nav className="app-nav" aria-label="Primary">
          <button type="button" onClick={() => setRoute({ name: "recipes" })}>
            Recipes
          </button>
          <button type="button" onClick={() => setRoute({ name: "cookbooks" })}>
            Cookbooks
          </button>
          <button type="button" onClick={() => setRoute({ name: "backup" })}>
            Backup
          </button>
          <button type="button" onClick={() => setRoute({ name: "planner" })}>
            Planner
          </button>
        </nav>
      </header>

      <section className="app-shell__surface" aria-label={appShellLabel}>
        {route.name === "recipes" ? (
          <RecipeListScreen
            key={`recipes-${revision}`}
            cookbookUseCases={cookbookUseCases}
            recipeUseCases={recipeUseCases}
            onCreateRecipe={() => setRoute({ name: "recipe-create" })}
            onChanged={markChanged}
            onEditRecipe={(recipeId) => setRoute({ name: "recipe-edit", recipeId })}
            onOpenRecipe={(recipeId) => setRoute({ name: "recipe-detail", recipeId })}
          />
        ) : null}

        {route.name === "recipe-detail" ? (
          <RecipeDetailScreen
            cookSessionUseCases={cookSessionUseCases}
            initialCookModeActive={route.openCookMode}
            initialTargetServings={route.targetServings}
            recipeId={route.recipeId}
            recipeExportUseCases={recipeExportUseCases}
            recipeUseCases={recipeUseCases}
            onBack={() => setRoute({ name: "recipes" })}
            onEdit={(recipeId) => setRoute({ name: "recipe-edit", recipeId })}
          />
        ) : null}

        {route.name === "recipe-create" ? (
          <RecipeFormScreen
            cookbookUseCases={cookbookUseCases}
            recipeUseCases={recipeUseCases}
            mode="create"
            onCancel={() => setRoute({ name: "recipes" })}
            onSaved={(recipeId) => {
              markChanged();
              setRoute({ name: "recipe-detail", recipeId });
            }}
          />
        ) : null}

        {route.name === "recipe-edit" ? (
          <RecipeFormScreen
            cookbookUseCases={cookbookUseCases}
            recipeId={route.recipeId}
            recipeUseCases={recipeUseCases}
            mode="edit"
            onCancel={() => setRoute({ name: "recipe-detail", recipeId: route.recipeId })}
            onDeleted={() => {
              markChanged();
              setRoute({ name: "recipes" });
            }}
            onSaved={(recipeId) => {
              markChanged();
              setRoute({ name: "recipe-detail", recipeId });
            }}
          />
        ) : null}

        {route.name === "cookbooks" ? (
          <CookbookManagerScreen
            cookbookUseCases={cookbookUseCases}
            recipeUseCases={recipeUseCases}
            onChanged={markChanged}
          />
        ) : null}

        {route.name === "planner" ? (
          <PlannerScreen
            mealPlanUseCases={mealPlanUseCases}
            onOpenRecipe={(recipeId, servings, openCookMode) =>
              setRoute({
                name: "recipe-detail",
                recipeId,
                targetServings: servings,
                openCookMode,
              })
            }
            recipeUseCases={recipeUseCases}
            onChanged={markChanged}
          />
        ) : null}

        {route.name === "backup" ? (
          <RecipeTransferScreen
            recipePackFileUseCases={recipePackFileUseCases}
            recipePackUseCases={recipePackUseCases}
            transferState={recipeTransferState}
            onImported={markChanged}
            onTransferStateChange={setRecipeTransferState}
          />
        ) : null}
      </section>
    </main>
  );
}
