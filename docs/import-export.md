# Import and Export

Comero uses a private JSON recipe pack for backup, device transfer, and AI-assisted bulk recipe creation.

## User-Facing Model

The UI should call the file a Comero backup or recipe pack. Users should not need to edit JSON by hand.

Primary flows:

- Export all recipes to a `.json` recipe pack.
- In the Android app, save/share the exported pack through the system chooser instead of relying on WebView blob downloads.
- Import a recipe pack from pasted text or a selected file.
- Preview valid and invalid recipes before saving.
- Import valid recipes as new private copies.
- Optionally create a new local cookbook during import and place the imported recipes there.
- Copy an AI prompt/template that asks for Comero-compatible recipe pack JSON.

## Mobile Export Behavior

Desktop browsers can download the exported pack as a normal `.json` file. Capacitor Android WebView does not reliably honor `blob:` links with the `download` attribute, so the installed app writes the generated JSON pack to the app cache and opens Android's save/share options for that file. If native sharing or browser download is unavailable, the UI copies the JSON to the clipboard when possible; otherwise it selects the visible Backup JSON text area for manual copying.

## Format

The current format is:

```json
{
  "format": "lacucina.recipe-pack",
  "version": 1,
  "exportedAt": "2026-05-24T00:00:00.000Z",
  "recipes": []
}
```

Recipes in a pack may include normal Comero recipe fields. Import generates fresh local IDs and timestamps so an imported recipe never overwrites an existing one.

Compatibility note: the JSON `format` identifier remains `lacucina.recipe-pack` so existing backups keep importing after the Comero rebrand.

When importing, users can keep the pack's existing cookbook assignments or create a new local cookbook for that import. New-cookbook import does not change the recipe-pack format: Comero creates the local cookbook from the UI-provided name, copies valid recipes into that cookbook, creates categories from each recipe's `categoryPath`, and places recipes without a category path in `General`.

The importer is intentionally forgiving for common AI output:

- Step strings are accepted and converted into ordered recipe steps.
- Dietary tags may be strings or structured tag objects.
- Ingredients marked `scaleMode: "toTaste"` or described as `do smaku` / `to taste` can omit a meaningful quantity and unit; import stores them as `1 to taste` and shows a cleanup note in preview.

## Boundaries

- Recipe packs include recipe records only.
- Template recipes are included as normal recipes with `isTemplate`.
- Existing photo references may be represented as metadata, but binary photo blobs are not exported yet.
- Cookbooks, planner entries, shopping lists, accounts, backend sync, and public publishing are not part of this format.
- CSV/XLSX import is a later convenience layer, not the source-of-truth backup format.
