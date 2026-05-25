import { LocalDatabaseError } from "../../../core/data/localDatabase";
import {
  createRecipeComponent,
  type RecipeComponent,
  type RecipeComponentInput,
} from "../domain/recipeComponent";

export type RecipeComponentRecord = RecipeComponentInput;

export function recipeComponentToRecord(component: RecipeComponent): RecipeComponentRecord {
  return structuredClone(component);
}

export function recipeComponentFromRecord(record: RecipeComponentRecord): RecipeComponent {
  const result = createRecipeComponent(structuredClone(record));

  if (!result.ok) {
    throw new LocalDatabaseError(
      "records-corrupt",
      `Recipe component record ${record.id} is invalid.`,
      result.error,
    );
  }

  return result.value;
}
