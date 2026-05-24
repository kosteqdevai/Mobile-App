# Portion Scaling

LaCucina scales ingredient quantities dynamically from the saved base recipe.

```text
scaled quantity = original quantity * target servings / base servings
```

The base recipe is never mutated by scaling. Scaling returns a derived ingredient view with:

- the original ingredient quantity;
- the scaled quantity for the requested serving count.
- the explicit scale mode and scaling behavior;
- optional guidance or warning text for non-linear kitchen behavior.

## Scale Modes

Ingredients default to `linear` when no mode is set.

Supported modes:

- `linear` - scales directly by the serving ratio.
- `integer` - scales by ratio, then rounds to a whole usable unit for items like eggs, buns, tortillas, apples, or jars.
- `fixed` - keeps the original quantity for items that should not automatically grow with servings, such as bay leaves or a garnish sprig.
- `toTaste` - scales by ratio but labels the result as a starting estimate that should be adjusted after tasting.
- `panDependent` - scales by ratio and returns a warning to review pan size and cook time.

These modes are intentionally conservative. They do not perform full unit conversion, baker's percentages, nutrition math, or professional formula scaling.

## Validation

Scaling fails with an explicit domain error when:

- base servings are not greater than zero;
- target servings are not greater than zero;
- an ingredient quantity is not greater than zero.

## Rounding and Formatting

Domain calculations keep the raw numeric result. Display formatting rounds to at most two decimal places and trims trailing zeroes.

Examples:

- `200 g`, base `2`, target `6` -> `600 g`
- `1.5 tbsp`, base `4`, target `3` -> raw `1.125 tbsp`, display `1.13 tbsp`
- `1 egg`, base `2`, target `5`, mode `integer` -> `3 eggs`
- `1 bay leaf`, mode `fixed` -> stays `1 bay leaf`
- salt with mode `toTaste` -> returns a scaled starting estimate plus adjust-to-taste guidance
- sheet-pan batter with mode `panDependent` -> returns a scaled estimate plus a pan/cook-time warning
