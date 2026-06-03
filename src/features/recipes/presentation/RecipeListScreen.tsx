import { useEffect, useMemo, useState } from "react";

import { ConfirmActionButton } from "../../../core/presentation/ConfirmActionButton";
import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { CookbookUseCases } from "../../cookbooks/application/cookbookUseCases";
import type { CategoryNode, Cookbook } from "../../cookbooks/domain/cookbook";
import type { Recipe } from "../domain/recipe";
import type { RecipeUseCases } from "../application/recipeUseCases";

type RecipeListScreenProps = {
  recipeUseCases: RecipeUseCases;
  cookbookUseCases: CookbookUseCases;
  onCreateRecipe: () => void;
  onOpenRecipe: (recipeId: string) => void;
  onEditRecipe: (recipeId: string) => void;
  onChanged: () => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; recipes: ReadonlyArray<Recipe>; cookbooks: ReadonlyArray<Cookbook> };

const allRecipesFilterValue = "all-recipes";
const defaultCookbookId = "cookbook-default";

export function RecipeListScreen({
  recipeUseCases,
  cookbookUseCases,
  onCreateRecipe,
  onOpenRecipe,
  onEditRecipe,
  onChanged,
}: RecipeListScreenProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [selectedCookbookId, setSelectedCookbookId] = useState(allRecipesFilterValue);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<ReadonlyArray<string>>([]);
  const [actionError, setActionError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function loadRecipes() {
      setLoadState({ status: "loading" });
      const [recipeResult, cookbookResult] = await Promise.all([
        recipeUseCases.listRecipes({ archivedOnly }),
        cookbookUseCases.listCookbooks(),
      ]);

      if (cancelled) {
        return;
      }

      if (!recipeResult.ok) {
        setLoadState({ status: "error", message: recipeResult.error.message });
        return;
      }

      if (!cookbookResult.ok) {
        setLoadState({ status: "error", message: cookbookResult.error.message });
        return;
      }

      setLoadState({
        status: "ready",
        recipes: recipeResult.value,
        cookbooks: cookbookResult.value,
      });
    }

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, [archivedOnly, cookbookUseCases, recipeUseCases]);

  const visibleRecipes = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }

    const cookbookRecipeIds = recipeIdsForCookbook(loadState.cookbooks, selectedCookbookId);

    return loadState.recipes.filter((recipe) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.includes(query));
      const matchesCookbook =
        selectedCookbookId === allRecipesFilterValue ||
        selectedCookbookId === defaultCookbookId ||
        recipe.cookbookId === selectedCookbookId ||
        cookbookRecipeIds.has(recipe.id);

      return matchesSearch && matchesCookbook && (!favoriteOnly || recipe.isFavorite);
    });
  }, [favoriteOnly, loadState, searchTerm, selectedCookbookId]);

  async function reloadRecipes() {
    const [recipeResult, cookbookResult] = await Promise.all([
      recipeUseCases.listRecipes({ archivedOnly }),
      cookbookUseCases.listCookbooks(),
    ]);

    if (!recipeResult.ok) {
      setLoadState({ status: "error", message: recipeResult.error.message });
      return;
    }

    if (!cookbookResult.ok) {
      setLoadState({ status: "error", message: cookbookResult.error.message });
      return;
    }

    setLoadState({ status: "ready", recipes: recipeResult.value, cookbooks: cookbookResult.value });
  }

  async function archiveRecipe(recipeId: string) {
    const result = await recipeUseCases.archiveRecipe(recipeId);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setActionError(undefined);
    setSelectedRecipeIds((currentIds) =>
      currentIds.filter((selectedId) => selectedId !== recipeId),
    );
    onChanged();
    await reloadRecipes();
  }

  async function restoreRecipe(recipeId: string) {
    const result = await recipeUseCases.restoreRecipe(recipeId);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setActionError(undefined);
    setSelectedRecipeIds((currentIds) =>
      currentIds.filter((selectedId) => selectedId !== recipeId),
    );
    onChanged();
    await reloadRecipes();
  }

  async function deleteRecipe(recipeId: string) {
    const result = await recipeUseCases.deleteRecipe(recipeId);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setActionError(undefined);
    setSelectedRecipeIds((currentIds) =>
      currentIds.filter((selectedId) => selectedId !== recipeId),
    );
    onChanged();
    await reloadRecipes();
  }

  async function archiveSelectedRecipes() {
    const result = await recipeUseCases.archiveRecipes(selectedRecipeIds);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setActionError(undefined);
    setSelectedRecipeIds([]);
    setIsBulkMode(false);
    onChanged();
    await reloadRecipes();
  }

  async function deleteSelectedRecipes() {
    const result = await recipeUseCases.deleteRecipes(selectedRecipeIds);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    setActionError(undefined);
    setSelectedRecipeIds([]);
    setIsBulkMode(false);
    onChanged();
    await reloadRecipes();
  }

  function toggleSelectedRecipe(recipeId: string, selected: boolean) {
    setSelectedRecipeIds((currentIds) =>
      selected
        ? Array.from(new Set([...currentIds, recipeId]))
        : currentIds.filter((selectedId) => selectedId !== recipeId),
    );
  }

  function selectAllVisibleRecipes() {
    setSelectedRecipeIds(visibleRecipes.map((recipe) => recipe.id));
  }

  function cancelBulkMode() {
    setIsBulkMode(false);
    setSelectedRecipeIds([]);
  }

  if (loadState.status === "loading") {
    return <LoadingView title="Loading recipes" />;
  }

  if (loadState.status === "error") {
    return (
      <ErrorView
        title="Recipes unavailable"
        message={loadState.message}
        action={{ label: "Try again", onClick: () => void reloadRecipes() }}
      />
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="recipes-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Cookbook</p>
          <h2 id="recipes-title">Recipes</h2>
        </div>
        <button className="primary-button" type="button" onClick={onCreateRecipe}>
          Add recipe
        </button>
      </div>

      {actionError ? <ErrorView title="Recipe action failed" message={actionError} /> : null}

      <div className="filter-bar">
        <label>
          <span>Search</span>
          <input
            aria-label="Search recipes"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name or tag"
          />
        </label>
        <label>
          <span>Cookbook</span>
          <select
            aria-label="Filter recipes by cookbook"
            value={selectedCookbookId}
            onChange={(event) => setSelectedCookbookId(event.target.value)}
          >
            <option value={allRecipesFilterValue}>All recipes</option>
            {loadState.cookbooks.map((cookbook) => (
              <option key={cookbook.id} value={cookbook.id}>
                {cookbook.id === defaultCookbookId
                  ? `${cookbook.name} (all recipes)`
                  : cookbook.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            checked={favoriteOnly}
            onChange={(event) => setFavoriteOnly(event.target.checked)}
            type="checkbox"
          />
          Favorites
        </label>
        <label className="checkbox-row">
          <input
            checked={archivedOnly}
            onChange={(event) => {
              setArchivedOnly(event.target.checked);
              setSelectedRecipeIds([]);
              setIsBulkMode(false);
            }}
            type="checkbox"
          />
          Archived
        </label>
      </div>

      {loadState.recipes.length === 0 ? (
        <EmptyView
          title={archivedOnly ? "No archived recipes" : "No recipes yet"}
          message={
            archivedOnly
              ? "Archived recipes will appear here after you archive them."
              : "Add your first private recipe to start the cookbook."
          }
          action={archivedOnly ? undefined : { label: "Add recipe", onClick: onCreateRecipe }}
        />
      ) : null}

      {loadState.recipes.length > 0 && visibleRecipes.length === 0 ? (
        <EmptyView title="No matches" message="Try a different search or filter." />
      ) : null}

      {visibleRecipes.length > 0 ? (
        <div className="bulk-action-bar" aria-label="Recipe bulk actions">
          {isBulkMode ? (
            <>
              <span className="muted-text">{selectedRecipeIds.length} selected</span>
              <button className="secondary-button" type="button" onClick={selectAllVisibleRecipes}>
                Select visible
              </button>
              {archivedOnly ? null : (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={selectedRecipeIds.length === 0}
                  onClick={() => void archiveSelectedRecipes()}
                >
                  Archive selected
                </button>
              )}
              {selectedRecipeIds.length > 0 ? (
                <ConfirmActionButton
                  className="secondary-button"
                  idleLabel="Delete selected"
                  confirmLabel="Confirm bulk delete"
                  onConfirm={() => void deleteSelectedRecipes()}
                />
              ) : (
                <button className="secondary-button" type="button" disabled>
                  Delete selected
                </button>
              )}
              <button className="text-button" type="button" onClick={cancelBulkMode}>
                Cancel
              </button>
            </>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setIsBulkMode(true)}>
              Select recipes
            </button>
          )}
        </div>
      ) : null}

      <div className="recipe-list" aria-label="Recipe results">
        {visibleRecipes.map((recipe) => (
          <article className="recipe-card" key={recipe.id}>
            {isBulkMode ? (
              <label className="checkbox-row recipe-card__select">
                <input
                  aria-label={`Select ${recipe.title}`}
                  checked={selectedRecipeIds.includes(recipe.id)}
                  onChange={(event) => toggleSelectedRecipe(recipe.id, event.target.checked)}
                  type="checkbox"
                />
              </label>
            ) : null}
            <button
              className="text-button recipe-card__main"
              type="button"
              onClick={() => onOpenRecipe(recipe.id)}
            >
              <span className="recipe-card__title">{recipe.title}</span>
              <span className="recipe-card__meta">
                {recipe.baseServings} servings · {recipe.difficulty}
              </span>
              {recipe.isTemplate ? <span className="pill">Template recipe</span> : null}
              {recipe.archivedAt ? <span className="pill">Archived</span> : null}
            </button>
            <div className="recipe-card__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => onEditRecipe(recipe.id)}
              >
                Edit
              </button>
              {recipe.archivedAt ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void restoreRecipe(recipe.id)}
                >
                  Restore
                </button>
              ) : (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void archiveRecipe(recipe.id)}
                >
                  Archive
                </button>
              )}
              <ConfirmActionButton
                idleLabel="Delete"
                confirmLabel="Confirm recipe delete"
                onConfirm={() => void deleteRecipe(recipe.id)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function recipeIdsForCookbook(
  cookbooks: ReadonlyArray<Cookbook>,
  selectedCookbookId: string,
): ReadonlySet<string> {
  if (selectedCookbookId === allRecipesFilterValue || selectedCookbookId === defaultCookbookId) {
    return new Set();
  }

  const selectedCookbook = cookbooks.find((cookbook) => cookbook.id === selectedCookbookId);

  if (!selectedCookbook) {
    return new Set();
  }

  return new Set(
    selectedCookbook.categories.flatMap((category) => recipeIdsFromCategory(category)),
  );
}

function recipeIdsFromCategory(category: CategoryNode): ReadonlyArray<string> {
  return [
    ...category.recipeIds,
    ...category.children.flatMap((child) => recipeIdsFromCategory(child)),
  ];
}
