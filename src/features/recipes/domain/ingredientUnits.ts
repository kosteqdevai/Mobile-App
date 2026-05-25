export type IngredientUnitType = "weight" | "volume" | "count" | "descriptive";

export type IngredientUnitDefinition = {
  value: string;
  label: string;
  type: IngredientUnitType;
};

export const ingredientUnitDefinitions: ReadonlyArray<IngredientUnitDefinition> = [
  { value: "g", label: "g", type: "weight" },
  { value: "kg", label: "kg", type: "weight" },
  { value: "oz", label: "oz", type: "weight" },
  { value: "lb", label: "lb", type: "weight" },
  { value: "ml", label: "ml", type: "volume" },
  { value: "l", label: "l", type: "volume" },
  { value: "tsp", label: "tsp", type: "volume" },
  { value: "tbsp", label: "tbsp", type: "volume" },
  { value: "cup", label: "cup", type: "volume" },
  { value: "fl oz", label: "fl oz", type: "volume" },
  { value: "pt", label: "pt", type: "volume" },
  { value: "qt", label: "qt", type: "volume" },
  { value: "gal", label: "gal", type: "volume" },
  { value: "pcs", label: "pcs", type: "count" },
  { value: "clove", label: "clove", type: "count" },
  { value: "cloves", label: "cloves", type: "count" },
  { value: "slice", label: "slice", type: "count" },
  { value: "piece", label: "piece", type: "count" },
  { value: "bunch", label: "bunch", type: "count" },
  { value: "stick of butter", label: "stick of butter", type: "descriptive" },
  { value: "can", label: "can", type: "descriptive" },
  { value: "package", label: "package", type: "descriptive" },
  { value: "pkg", label: "pkg", type: "descriptive" },
  { value: "pinch", label: "pinch", type: "descriptive" },
  { value: "dash", label: "dash", type: "descriptive" },
];

export const ingredientUnitOptions = ingredientUnitDefinitions.map(
  (definition) => definition.value,
);

export function getIngredientUnitDefinition(unit: string) {
  const normalizedUnit = unit.trim().toLowerCase();
  return ingredientUnitDefinitions.find(
    (definition) => definition.value.toLowerCase() === normalizedUnit,
  );
}
