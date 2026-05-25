import type { RecipeComponent } from "../domain/recipeComponent";

export type RecipeComponentRepository = {
  save(component: RecipeComponent): Promise<void>;
  getById(componentId: string): Promise<RecipeComponent | undefined>;
  list(): Promise<ReadonlyArray<RecipeComponent>>;
  delete(componentId: string): Promise<void>;
};
