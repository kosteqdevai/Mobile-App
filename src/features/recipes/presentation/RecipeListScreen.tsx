import { useEffect, useMemo, useState } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { Recipe } from "../domain/recipe";
import type { RecipeUseCases } from "../application/recipeUseCases";

type RecipeListScreenProps = {
  recipeUseCases: RecipeUseCases;
  onCreateRecipe: () => void;
  onOpenRecipe: (recipeId: string) => void;
  onEditRecipe: (recipeId: string) => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; recipes: ReadonlyArray<Recipe> };

export function RecipeListScreen({
  recipeUseCases,
  onCreateRecipe,
  onOpenRecipe,
  onEditRecipe,
}: RecipeListScreenProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [searchTerm, setSearchTerm] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipes() {
      setLoadState({ status: "loading" });
      const result = await recipeUseCases.listRecipes();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setLoadState({ status: "error", message: result.error.message });
        return;
      }

      setLoadState({ status: "ready", recipes: result.value });
    }

    void loadRecipes();

    return () => {
      cancelled = true;
    };
  }, [recipeUseCases]);

  const visibleRecipes = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }

    return loadState.recipes.filter((recipe) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.includes(query));

      return matchesSearch && (!favoriteOnly || recipe.isFavorite);
    });
  }, [favoriteOnly, loadState, searchTerm]);

  if (loadState.status === "loading") {
    return <LoadingView title="Loading recipes" />;
  }

  if (loadState.status === "error") {
    return (
      <ErrorView
        title="Recipes unavailable"
        message={loadState.message}
        action={{ label: "Try again", onClick: () => setLoadState({ status: "loading" }) }}
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
        <label className="checkbox-row">
          <input
            checked={favoriteOnly}
            onChange={(event) => setFavoriteOnly(event.target.checked)}
            type="checkbox"
          />
          Favorites
        </label>
      </div>

      {loadState.recipes.length === 0 ? (
        <EmptyView
          title="No recipes yet"
          message="Add your first private recipe to start the cookbook."
          action={{ label: "Add recipe", onClick: onCreateRecipe }}
        />
      ) : null}

      {loadState.recipes.length > 0 && visibleRecipes.length === 0 ? (
        <EmptyView title="No matches" message="Try a different search or filter." />
      ) : null}

      <div className="recipe-list" aria-label="Recipe results">
        {visibleRecipes.map((recipe) => (
          <article className="recipe-card" key={recipe.id}>
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
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onEditRecipe(recipe.id)}
            >
              Edit
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
