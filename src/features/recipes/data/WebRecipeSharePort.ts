import { err, ok, type Result } from "../../../core/result/Result";
import type {
  RecipeExportError,
  RecipeExportPayload,
  RecipeSharePort,
} from "../application/recipeExportUseCases";

type WebNavigatorShare = Navigator & {
  share?: (data: { title: string; text: string }) => Promise<void>;
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
};

export class WebRecipeSharePort implements RecipeSharePort {
  constructor(private readonly navigator: WebNavigatorShare) {}

  async shareText(payload: RecipeExportPayload): Promise<Result<void, RecipeExportError>> {
    try {
      if (this.navigator.share) {
        await this.navigator.share({ title: payload.title, text: payload.text });
        return ok(undefined);
      }

      if (this.navigator.clipboard?.writeText) {
        await this.navigator.clipboard.writeText(payload.text);
        return ok(undefined);
      }

      return err({
        code: "share-unavailable",
        message: "Sharing is not available in this browser.",
      });
    } catch (error) {
      return err({
        code: "share-unavailable",
        message: "Recipe export could not be shared.",
        details: error,
      });
    }
  }
}
