export type AppRoute =
  | { name: "recipes" }
  | {
      name: "recipe-detail";
      recipeId: string;
      targetServings?: number;
      openCookMode?: boolean;
    }
  | { name: "recipe-create" }
  | { name: "recipe-edit"; recipeId: string }
  | { name: "cookbooks" }
  | { name: "backup" }
  | { name: "planner" };
