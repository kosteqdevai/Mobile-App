export type AppRoute =
  | { name: "recipes" }
  | { name: "recipe-detail"; recipeId: string }
  | { name: "recipe-create" }
  | { name: "recipe-edit"; recipeId: string }
  | { name: "cookbooks" }
  | { name: "planner" };
