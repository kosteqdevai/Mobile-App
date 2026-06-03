import { err, ok, type Result } from "../../../core/result/Result";
import type {
  RecipePackFileError,
  RecipePackFilePort,
  RecipePackFileSaveInput,
  RecipePackFileSaveResult,
} from "../application/recipePackFileUseCases";

type BrowserDocument = Pick<Document, "body" | "createElement">;

type WebNavigatorWithClipboard = Navigator & {
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
};

type CapacitorGlobal = typeof globalThis & {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

export class WebRecipePackFilePort implements RecipePackFilePort {
  constructor(
    private readonly navigator: WebNavigatorWithClipboard,
    private readonly document: BrowserDocument,
    private readonly globals: CapacitorGlobal = globalThis as CapacitorGlobal,
  ) {}

  async saveRecipePackFile(
    input: RecipePackFileSaveInput,
  ): Promise<Result<RecipePackFileSaveResult, RecipePackFileError>> {
    const nativeResult = await this.tryNativeShare(input);

    if (nativeResult.ok) {
      return nativeResult;
    }

    if (!this.isNativeWebView() && this.tryBrowserDownload(input)) {
      return ok({
        mode: "browser-download",
        message: "Backup download started.",
      });
    }

    const clipboardResult = await this.tryClipboardCopy(input.pack.json);

    if (clipboardResult.ok) {
      return clipboardResult;
    }

    return err({
      code: "save-unavailable",
      message:
        nativeResult.error?.message ??
        clipboardResult.error?.message ??
        "Backup download is unavailable here.",
    });
  }

  private async tryNativeShare(
    input: RecipePackFileSaveInput,
  ): Promise<Result<RecipePackFileSaveResult, RecipePackFileError | undefined>> {
    if (!this.isNativeWebView()) {
      return err(undefined);
    }

    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const path = input.pack.fileName;

      await Filesystem.writeFile({
        path,
        data: input.pack.json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const file = await Filesystem.getUri({
        path,
        directory: Directory.Cache,
      });
      const canShare = await Share.canShare();

      if (!canShare.value) {
        return err({
          code: "save-unavailable",
          message: "Android sharing is unavailable for this backup file.",
        });
      }

      await Share.share({
        title: "Comero recipe backup",
        text: `Comero backup: ${input.pack.fileName}`,
        files: [file.uri],
        dialogTitle: "Save or share recipe backup",
      });

      return ok({
        mode: "native-share",
        message: "Backup file opened in Android save/share options.",
      });
    } catch (error) {
      return err({
        code: "save-unavailable",
        message: "Android could not open the backup file action.",
        details: error,
      });
    }
  }

  private tryBrowserDownload(input: RecipePackFileSaveInput) {
    try {
      const link = this.document.createElement("a");
      link.href = input.downloadUrl;
      link.download = input.pack.fileName;
      link.rel = "noopener";
      link.style.display = "none";
      this.document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch {
      return false;
    }
  }

  private async tryClipboardCopy(
    json: string,
  ): Promise<Result<RecipePackFileSaveResult, RecipePackFileError | undefined>> {
    if (!this.navigator.clipboard?.writeText) {
      return err(undefined);
    }

    try {
      await this.navigator.clipboard.writeText(json);
      return ok({
        mode: "clipboard",
        message: "Backup JSON copied. Save it as a .json file outside the app.",
      });
    } catch (error) {
      return err({
        code: "save-unavailable",
        message: "Backup JSON could not be copied.",
        details: error,
      });
    }
  }

  private isNativeWebView() {
    const capacitor = this.globals.Capacitor;

    return (
      capacitor?.isNativePlatform?.() === true ||
      capacitor?.getPlatform?.() === "android" ||
      capacitor?.getPlatform?.() === "ios"
    );
  }
}
