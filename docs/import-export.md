# Import and Export

LaCucina uses a private JSON recipe pack for backup, device transfer, and AI-assisted bulk recipe creation.

## User-Facing Model

The UI should call the file a LaCucina backup or recipe pack. Users should not need to edit JSON by hand.

Primary flows:

- Export all recipes to a `.json` recipe pack.
- Import a recipe pack from pasted text or a selected file.
- Preview valid and invalid recipes before saving.
- Import valid recipes as new private copies.
- Copy an AI prompt/template that asks for LaCucina-compatible recipe pack JSON.

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

Recipes in a pack may include normal LaCucina recipe fields. Import generates fresh local IDs and timestamps so an imported recipe never overwrites an existing one.

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
