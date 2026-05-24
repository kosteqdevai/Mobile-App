import type { CategoryNode, Cookbook } from "./cookbook";

export type CategoryPathOption = {
  cookbookId: string;
  categoryId: string;
  label: string;
  path: ReadonlyArray<string>;
};

export function flattenCategoryPathOptions(
  cookbooks: ReadonlyArray<Cookbook>,
): ReadonlyArray<CategoryPathOption> {
  return cookbooks.flatMap((cookbook) =>
    cookbook.categories.flatMap((category) =>
      flattenCategory(cookbook.id, category, [], cookbooks.length > 1 ? cookbook.name : undefined),
    ),
  );
}

function flattenCategory(
  cookbookId: string,
  category: CategoryNode,
  parentPath: ReadonlyArray<string>,
  cookbookName: string | undefined,
): ReadonlyArray<CategoryPathOption> {
  const path = [...parentPath, category.name];
  const labelPrefix = cookbookName ? `${cookbookName} / ` : "";
  const option: CategoryPathOption = {
    cookbookId,
    categoryId: category.id,
    label: `${labelPrefix}${path.join(" / ")}`,
    path,
  };

  return [
    option,
    ...category.children.flatMap((child) => flattenCategory(cookbookId, child, path, cookbookName)),
  ];
}
