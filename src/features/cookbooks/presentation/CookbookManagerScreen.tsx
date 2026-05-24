import { useEffect, useMemo, useState } from "react";

import { ConfirmActionButton } from "../../../core/presentation/ConfirmActionButton";
import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { RecipeUseCases } from "../../recipes/application/recipeUseCases";
import type { Recipe } from "../../recipes/domain/recipe";
import type { CookbookUseCases } from "../application/cookbookUseCases";
import type { CategoryNode, Cookbook } from "../domain/cookbook";

type CookbookManagerScreenProps = {
  cookbookUseCases: CookbookUseCases;
  recipeUseCases: RecipeUseCases;
  onChanged: () => void;
};

type CookbookState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      cookbooks: ReadonlyArray<Cookbook>;
      recipes: ReadonlyArray<Recipe>;
      selectedCookbookId: string;
      selectedCategoryId?: string;
      error?: string;
    };

export function CookbookManagerScreen({
  cookbookUseCases,
  recipeUseCases,
  onChanged,
}: CookbookManagerScreenProps) {
  const [cookbookState, setCookbookState] = useState<CookbookState>({ status: "loading" });
  const [categoryName, setCategoryName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [recipeId, setRecipeId] = useState("");

  useEffect(() => {
    void loadCookbooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookbookUseCases, recipeUseCases]);

  const selectedCookbook = useMemo(() => {
    if (cookbookState.status !== "ready") {
      return undefined;
    }

    return cookbookState.cookbooks.find(
      (cookbook) => cookbook.id === cookbookState.selectedCookbookId,
    );
  }, [cookbookState]);

  const selectedCategory = useMemo(() => {
    if (
      !selectedCookbook ||
      cookbookState.status !== "ready" ||
      !cookbookState.selectedCategoryId
    ) {
      return undefined;
    }

    return flattenCategories(selectedCookbook.categories).find(
      (category) => category.id === cookbookState.selectedCategoryId,
    );
  }, [cookbookState, selectedCookbook]);

  async function loadCookbooks(nextSelectedCategoryId?: string) {
    setCookbookState({ status: "loading" });
    const [cookbookResult, recipeResult] = await Promise.all([
      cookbookUseCases.listCookbooks(),
      recipeUseCases.listRecipes(),
    ]);

    if (!cookbookResult.ok) {
      setCookbookState({ status: "error", message: cookbookResult.error.message });
      return;
    }

    if (!recipeResult.ok) {
      setCookbookState({ status: "error", message: recipeResult.error.message });
      return;
    }

    const firstCookbook = cookbookResult.value[0];
    const firstCategory = firstCookbook
      ? flattenCategories(firstCookbook.categories)[0]
      : undefined;

    setCookbookState({
      status: "ready",
      cookbooks: cookbookResult.value,
      recipes: recipeResult.value,
      selectedCookbookId: firstCookbook?.id ?? "",
      selectedCategoryId: nextSelectedCategoryId ?? firstCategory?.id,
    });
  }

  async function createCategory() {
    if (cookbookState.status !== "ready" || !selectedCookbook) {
      return;
    }

    const result = await cookbookUseCases.createCategory(selectedCookbook.id, {
      id: `category-${Date.now()}`,
      name: categoryName,
    });

    if (!result.ok) {
      setCookbookState({ ...cookbookState, error: result.error.message });
      return;
    }

    setCategoryName("");
    onChanged();
    await loadCookbooks(result.value.categories.at(-1)?.id);
  }

  async function renameCategory() {
    if (cookbookState.status !== "ready" || !selectedCookbook || !selectedCategory) {
      return;
    }

    const result = await cookbookUseCases.renameCategory(
      selectedCookbook.id,
      selectedCategory.id,
      renameValue,
    );

    if (!result.ok) {
      setCookbookState({ ...cookbookState, error: result.error.message });
      return;
    }

    setRenameValue("");
    onChanged();
    await loadCookbooks(selectedCategory.id);
  }

  async function assignRecipe() {
    if (cookbookState.status !== "ready" || !selectedCookbook || !selectedCategory) {
      return;
    }

    const result = await cookbookUseCases.assignRecipe(
      selectedCookbook.id,
      selectedCategory.id,
      recipeId,
    );

    if (!result.ok) {
      setCookbookState({ ...cookbookState, error: result.error.message });
      return;
    }

    setRecipeId("");
    onChanged();
    await loadCookbooks(selectedCategory.id);
  }

  async function unassignRecipe(recipeIdToRemove: string) {
    if (cookbookState.status !== "ready" || !selectedCookbook || !selectedCategory) {
      return;
    }

    const result = await cookbookUseCases.unassignRecipe(
      selectedCookbook.id,
      selectedCategory.id,
      recipeIdToRemove,
    );

    if (!result.ok) {
      setCookbookState({ ...cookbookState, error: result.error.message });
      return;
    }

    onChanged();
    await loadCookbooks(selectedCategory.id);
  }

  async function deleteSelectedCategory() {
    if (cookbookState.status !== "ready" || !selectedCookbook || !selectedCategory) {
      return;
    }

    const result = await cookbookUseCases.deleteCategory(selectedCookbook.id, selectedCategory.id);

    if (!result.ok) {
      setCookbookState({
        ...cookbookState,
        error: result.error.message,
      });
      return;
    }

    onChanged();
    await loadCookbooks();
  }

  if (cookbookState.status === "loading") {
    return <LoadingView title="Loading cookbooks" />;
  }

  if (cookbookState.status === "error") {
    return (
      <ErrorView
        title="Cookbooks unavailable"
        message={cookbookState.message}
        action={{ label: "Try again", onClick: () => void loadCookbooks() }}
      />
    );
  }

  if (cookbookState.cookbooks.length === 0) {
    return (
      <EmptyView
        title="No cookbook yet"
        message="Create the first cookbook through the application layer before organizing recipes."
      />
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="cookbooks-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Organization</p>
          <h2 id="cookbooks-title">Cookbooks</h2>
        </div>
      </div>

      {cookbookState.error ? (
        <ErrorView title="Cookbook action failed" message={cookbookState.error} />
      ) : null}

      <label>
        <span>Cookbook</span>
        <select
          aria-label="Selected cookbook"
          value={cookbookState.selectedCookbookId}
          onChange={(event) =>
            setCookbookState({
              ...cookbookState,
              selectedCookbookId: event.target.value,
              selectedCategoryId: undefined,
              error: undefined,
            })
          }
        >
          {cookbookState.cookbooks.map((cookbook) => (
            <option key={cookbook.id} value={cookbook.id}>
              {cookbook.name}
            </option>
          ))}
        </select>
      </label>

      <div className="split-panel">
        <section aria-labelledby="categories-title">
          <h3 id="categories-title">Categories</h3>
          {selectedCookbook && selectedCookbook.categories.length > 0 ? (
            <div className="category-list">
              {selectedCookbook.categories.map((category) => (
                <CategoryTree
                  category={category}
                  depth={0}
                  key={category.id}
                  selectedCategoryId={cookbookState.selectedCategoryId}
                  onSelect={(categoryId) =>
                    setCookbookState({
                      ...cookbookState,
                      selectedCategoryId: categoryId,
                      error: undefined,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyView title="No categories" message="Add a category to start organizing." />
          )}
        </section>

        <section className="screen-stack" aria-labelledby="category-actions-title">
          <h3 id="category-actions-title">Manage category</h3>
          <div className="form-grid">
            <label>
              <span>New category</span>
              <input
                aria-label="New category name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
              />
            </label>
            <button className="primary-button" type="button" onClick={() => void createCategory()}>
              Create category
            </button>
          </div>

          {selectedCategory ? (
            <div className="screen-stack">
              <p className="muted-text">Selected: {selectedCategory.name}</p>
              <div className="form-grid">
                <label>
                  <span>Rename selected</span>
                  <input
                    aria-label="Rename selected category"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder={selectedCategory.name}
                  />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void renameCategory()}
                >
                  Rename
                </button>
              </div>

              <div className="form-grid">
                <label>
                  <span>Assign recipe</span>
                  <select
                    aria-label="Recipe to assign"
                    value={recipeId}
                    onChange={(event) => setRecipeId(event.target.value)}
                  >
                    <option value="">Choose recipe</option>
                    {cookbookState.recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void assignRecipe()}
                >
                  Assign
                </button>
              </div>

              {selectedCategory.recipeIds.length > 0 ? (
                <ul className="compact-list" aria-label="Assigned recipes">
                  {selectedCategory.recipeIds.map((assignedRecipeId) => (
                    <li key={assignedRecipeId}>
                      <span>{recipeTitle(cookbookState.recipes, assignedRecipeId)}</span>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => void unassignRecipe(assignedRecipeId)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyView title="No assigned recipes" message="Assign a saved recipe here." />
              )}

              <ConfirmActionButton
                idleLabel="Delete category"
                confirmLabel="Confirm category delete"
                onConfirm={() => void deleteSelectedCategory()}
              />
            </div>
          ) : (
            <EmptyView title="No category selected" message="Choose a category to manage it." />
          )}
        </section>
      </div>
    </section>
  );
}

type CategoryTreeProps = {
  category: CategoryNode;
  depth: number;
  selectedCategoryId?: string;
  onSelect: (categoryId: string) => void;
};

function CategoryTree({ category, depth, selectedCategoryId, onSelect }: CategoryTreeProps) {
  return (
    <div className="category-list__item" style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        aria-pressed={selectedCategoryId === category.id}
        className="text-button"
        type="button"
        onClick={() => onSelect(category.id)}
      >
        {category.name}
      </button>
      {category.children.map((child) => (
        <CategoryTree
          category={child}
          depth={depth + 1}
          key={child.id}
          onSelect={onSelect}
          selectedCategoryId={selectedCategoryId}
        />
      ))}
    </div>
  );
}

function flattenCategories(categories: ReadonlyArray<CategoryNode>): CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function recipeTitle(recipes: ReadonlyArray<Recipe>, recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId)?.title ?? `Missing recipe ${recipeId}`;
}
