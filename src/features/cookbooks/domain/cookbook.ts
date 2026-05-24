import { err, ok, type Result } from "../../../core/result/Result";

export type CategoryNode = {
  id: string;
  name: string;
  recipeIds: ReadonlyArray<string>;
  children: ReadonlyArray<CategoryNode>;
};

export type Cookbook = {
  id: string;
  name: string;
  categories: ReadonlyArray<CategoryNode>;
  createdAt: string;
  updatedAt: string;
};

export type CookbookInput = {
  id: string;
  name: string;
  categories?: ReadonlyArray<CategoryNode>;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  id: string;
  name: string;
  parentCategoryId?: string;
};

export type CookbookErrorCode =
  | "cookbook-id-required"
  | "cookbook-name-required"
  | "cookbook-date-required"
  | "category-id-required"
  | "category-name-required"
  | "category-duplicate-name"
  | "category-not-found"
  | "category-not-empty"
  | "recipe-id-required"
  | "recipe-already-assigned";

export type CookbookError = {
  code: CookbookErrorCode;
  message: string;
  path: string;
};

export function createCookbook(input: CookbookInput): Result<Cookbook, CookbookError[]> {
  const errors: CookbookError[] = [];

  if (input.id.trim().length === 0) {
    errors.push(cookbookError("cookbook-id-required", "Cookbook id is required.", "id"));
  }

  if (input.name.trim().length === 0) {
    errors.push(cookbookError("cookbook-name-required", "Cookbook name is required.", "name"));
  }

  if (input.createdAt.trim().length === 0) {
    errors.push(cookbookError("cookbook-date-required", "Created date is required.", "createdAt"));
  }

  if (input.updatedAt.trim().length === 0) {
    errors.push(cookbookError("cookbook-date-required", "Updated date is required.", "updatedAt"));
  }

  const categoryValidation = validateCategoryList(input.categories ?? [], "categories");
  errors.push(...categoryValidation);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: input.id.trim(),
    name: input.name.trim(),
    categories: normalizeCategories(input.categories ?? []),
    createdAt: input.createdAt.trim(),
    updatedAt: input.updatedAt.trim(),
  });
}

export function addCategory(
  cookbook: Cookbook,
  input: CategoryInput,
): Result<Cookbook, CookbookError> {
  const name = input.name.trim();
  const id = input.id.trim();

  if (id.length === 0) {
    return err(cookbookError("category-id-required", "Category id is required.", "category.id"));
  }

  if (name.length === 0) {
    return err(
      cookbookError("category-name-required", "Category name is required.", "category.name"),
    );
  }

  if (input.parentCategoryId) {
    const parent = findCategory(cookbook.categories, input.parentCategoryId);

    if (!parent) {
      return err(
        cookbookError(
          "category-not-found",
          "Parent category was not found.",
          "category.parentCategoryId",
        ),
      );
    }

    if (hasSiblingNamed(parent.children, name)) {
      return err(
        cookbookError(
          "category-duplicate-name",
          "A category with this name already exists in this tab.",
          "category.name",
        ),
      );
    }

    return ok({
      ...cookbook,
      categories: updateCategory(cookbook.categories, input.parentCategoryId, (category) => ({
        ...category,
        children: [
          ...category.children,
          {
            id,
            name,
            recipeIds: [],
            children: [],
          },
        ],
      })),
    });
  }

  if (hasSiblingNamed(cookbook.categories, name)) {
    return err(
      cookbookError(
        "category-duplicate-name",
        "A root category with this name already exists.",
        "category.name",
      ),
    );
  }

  return ok({
    ...cookbook,
    categories: [
      ...cookbook.categories,
      {
        id,
        name,
        recipeIds: [],
        children: [],
      },
    ],
  });
}

export function renameCategory(
  cookbook: Cookbook,
  categoryId: string,
  nextName: string,
): Result<Cookbook, CookbookError> {
  const name = nextName.trim();

  if (name.length === 0) {
    return err(
      cookbookError("category-name-required", "Category name is required.", "category.name"),
    );
  }

  const location = findCategoryLocation(cookbook.categories, categoryId);

  if (!location) {
    return err(cookbookError("category-not-found", "Category was not found.", "categoryId"));
  }

  if (hasSiblingNamed(location.siblings, name, categoryId)) {
    return err(
      cookbookError(
        "category-duplicate-name",
        "A category with this name already exists in this tab.",
        "category.name",
      ),
    );
  }

  return ok({
    ...cookbook,
    categories: updateCategory(cookbook.categories, categoryId, (category) => ({
      ...category,
      name,
    })),
  });
}

export function assignRecipeToCategory(
  cookbook: Cookbook,
  categoryId: string,
  recipeId: string,
): Result<Cookbook, CookbookError> {
  const normalizedRecipeId = recipeId.trim();

  if (normalizedRecipeId.length === 0) {
    return err(cookbookError("recipe-id-required", "Recipe id is required.", "recipeId"));
  }

  const category = findCategory(cookbook.categories, categoryId);

  if (!category) {
    return err(cookbookError("category-not-found", "Category was not found.", "categoryId"));
  }

  if (category.recipeIds.includes(normalizedRecipeId)) {
    return err(
      cookbookError(
        "recipe-already-assigned",
        "Recipe is already assigned to this category.",
        "recipeId",
      ),
    );
  }

  return ok({
    ...cookbook,
    categories: updateCategory(cookbook.categories, categoryId, (node) => ({
      ...node,
      recipeIds: [...node.recipeIds, normalizedRecipeId],
    })),
  });
}

export function removeRecipeFromCategory(cookbook: Cookbook, categoryId: string, recipeId: string) {
  return {
    ...cookbook,
    categories: updateCategory(cookbook.categories, categoryId, (node) => ({
      ...node,
      recipeIds: node.recipeIds.filter((id) => id !== recipeId),
    })),
  };
}

export function deleteCategory(
  cookbook: Cookbook,
  categoryId: string,
): Result<Cookbook, CookbookError> {
  const category = findCategory(cookbook.categories, categoryId);

  if (!category) {
    return err(cookbookError("category-not-found", "Category was not found.", "categoryId"));
  }

  if (category.recipeIds.length > 0 || category.children.length > 0) {
    return err(
      cookbookError(
        "category-not-empty",
        "Only empty categories can be deleted safely.",
        "categoryId",
      ),
    );
  }

  return ok({
    ...cookbook,
    categories: removeCategory(cookbook.categories, categoryId),
  });
}

export function findCategory(
  categories: ReadonlyArray<CategoryNode>,
  categoryId: string,
): CategoryNode | undefined {
  for (const category of categories) {
    if (category.id === categoryId) {
      return category;
    }

    const child = findCategory(category.children, categoryId);

    if (child) {
      return child;
    }
  }

  return undefined;
}

function normalizeCategories(categories: ReadonlyArray<CategoryNode>): ReadonlyArray<CategoryNode> {
  return categories.map((category) => ({
    id: category.id.trim(),
    name: category.name.trim(),
    recipeIds: Array.from(new Set(category.recipeIds.map((recipeId) => recipeId.trim()))),
    children: normalizeCategories(category.children),
  }));
}

function validateCategoryList(
  categories: ReadonlyArray<CategoryNode>,
  path: string,
): CookbookError[] {
  const errors: CookbookError[] = [];
  const names = new Set<string>();

  categories.forEach((category, index) => {
    const categoryPath = `${path}.${index}`;
    const name = category.name.trim().toLowerCase();

    if (category.id.trim().length === 0) {
      errors.push(
        cookbookError("category-id-required", "Category id is required.", `${categoryPath}.id`),
      );
    }

    if (category.name.trim().length === 0) {
      errors.push(
        cookbookError(
          "category-name-required",
          "Category name is required.",
          `${categoryPath}.name`,
        ),
      );
    }

    if (name.length > 0 && names.has(name)) {
      errors.push(
        cookbookError(
          "category-duplicate-name",
          "Duplicate category names are not allowed in the same tab.",
          `${categoryPath}.name`,
        ),
      );
    }

    names.add(name);
    errors.push(...validateCategoryList(category.children, `${categoryPath}.children`));
  });

  return errors;
}

function hasSiblingNamed(
  categories: ReadonlyArray<CategoryNode>,
  name: string,
  ignoredCategoryId?: string,
) {
  const normalizedName = name.trim().toLowerCase();

  return categories.some(
    (category) =>
      category.id !== ignoredCategoryId && category.name.trim().toLowerCase() === normalizedName,
  );
}

function updateCategory(
  categories: ReadonlyArray<CategoryNode>,
  categoryId: string,
  update: (category: CategoryNode) => CategoryNode,
): ReadonlyArray<CategoryNode> {
  return categories.map((category) => {
    if (category.id === categoryId) {
      return update(category);
    }

    return {
      ...category,
      children: updateCategory(category.children, categoryId, update),
    };
  });
}

function removeCategory(
  categories: ReadonlyArray<CategoryNode>,
  categoryId: string,
): ReadonlyArray<CategoryNode> {
  return categories
    .filter((category) => category.id !== categoryId)
    .map((category) => ({
      ...category,
      children: removeCategory(category.children, categoryId),
    }));
}

function findCategoryLocation(
  categories: ReadonlyArray<CategoryNode>,
  categoryId: string,
): { category: CategoryNode; siblings: ReadonlyArray<CategoryNode> } | undefined {
  for (const category of categories) {
    if (category.id === categoryId) {
      return { category, siblings: categories };
    }

    const childLocation = findCategoryLocation(category.children, categoryId);

    if (childLocation) {
      return childLocation;
    }
  }

  return undefined;
}

function cookbookError(code: CookbookErrorCode, message: string, path: string): CookbookError {
  return {
    code,
    message,
    path,
  };
}
