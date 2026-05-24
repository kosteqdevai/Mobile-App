import { err, ok, type Result } from "../../../core/result/Result";

export type LoopDayPreset = "training" | "nonTraining" | "custom";

export type PlannerBoardPreset = "weekly" | "rolling7" | "month" | "customLoop";

export type PlannedMealEntryContext = "cook" | "eat" | "prep";

export type MealPlanEntry = {
  id: string;
  recipeId: string;
  servings: number;
};

export type LoopDay = {
  id: string;
  label: string;
  preset: LoopDayPreset;
  entries: ReadonlyArray<MealPlanEntry>;
};

export type PlannerSlotTemplate = {
  id: string;
  label: string;
};

export type PlannerBoardEntry = {
  id: string;
  recipeId: string;
  servings: number;
  slotId?: string;
  customSlotLabel?: string;
  context?: PlannedMealEntryContext;
};

export type PlannerDayBucket = {
  id: string;
  label: string;
  date?: string;
  entries: ReadonlyArray<PlannerBoardEntry>;
};

export type PlannerBoard = {
  preset: PlannerBoardPreset;
  startDate?: string;
  slotTemplates: ReadonlyArray<PlannerSlotTemplate>;
  days: ReadonlyArray<PlannerDayBucket>;
};

export type MealPlan = {
  id: string;
  name: string;
  loopDays: ReadonlyArray<LoopDay>;
  board?: PlannerBoard;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanInput = {
  id: string;
  name: string;
  loopDays?: ReadonlyArray<LoopDay>;
  board?: PlannerBoard;
  createdAt: string;
  updatedAt: string;
};

export type LoopDayInput = {
  id: string;
  label: string;
  preset: LoopDayPreset;
};

export type MealPlanEntryInput = {
  id: string;
  recipeId: string;
  servings: number;
};

export type PlannerBoardConfigurationInput = {
  preset: PlannerBoardPreset;
  startDate?: string;
  customDayLabels?: ReadonlyArray<string>;
  slotTemplates?: ReadonlyArray<PlannerSlotTemplate>;
};

export type PlannerBoardEntryInput = PlannerBoardEntry;

export type PlannerBoardMoveInput = {
  targetDayId: string;
  targetSlotId?: string;
  targetCustomSlotLabel?: string;
};

export type MealPlanErrorCode =
  | "plan-id-required"
  | "plan-name-required"
  | "plan-date-required"
  | "day-id-required"
  | "day-label-required"
  | "day-not-found"
  | "entry-id-required"
  | "recipe-id-required"
  | "servings-invalid"
  | "entry-not-found"
  | "board-preset-invalid"
  | "board-date-invalid"
  | "board-day-id-required"
  | "board-day-label-required"
  | "board-day-not-found"
  | "board-slot-id-required"
  | "board-slot-label-required"
  | "board-slot-not-found"
  | "board-entry-not-found"
  | "board-context-invalid";

export type MealPlanError = {
  code: MealPlanErrorCode;
  message: string;
  path: string;
};

export const DEFAULT_PLANNER_SLOT_TEMPLATES: ReadonlyArray<PlannerSlotTemplate> = [
  { id: "slot-breakfast", label: "Breakfast" },
  { id: "slot-lunch", label: "Lunch" },
  { id: "slot-dinner", label: "Dinner" },
  { id: "slot-snack", label: "Snack" },
];

const weeklyLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultCustomLoopLabels = ["Training Day", "Non-training Day"];
const plannerBoardPresets: ReadonlyArray<PlannerBoardPreset> = [
  "weekly",
  "rolling7",
  "month",
  "customLoop",
];
const plannedMealContexts: ReadonlyArray<PlannedMealEntryContext> = ["cook", "eat", "prep"];

export function createMealPlan(input: MealPlanInput): Result<MealPlan, MealPlanError[]> {
  const errors = validateMealPlanInput(input);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(normalizeMealPlan(input));
}

export function normalizeMealPlan(input: MealPlanInput | MealPlan): MealPlan {
  const normalizedLoopDays = (input.loopDays ?? []).map(normalizeLoopDay);
  const normalizedBase = {
    id: input.id.trim(),
    name: input.name.trim(),
    loopDays: normalizedLoopDays,
    createdAt: input.createdAt.trim(),
    updatedAt: input.updatedAt.trim(),
  };

  return {
    ...normalizedBase,
    board: input.board
      ? normalizePlannerBoard(input.board)
      : createFallbackPlannerBoard(normalizedLoopDays),
  };
}

export function configurePlannerBoard(
  plan: MealPlan,
  input: PlannerBoardConfigurationInput,
): Result<MealPlan, MealPlanError> {
  const errors = validateBoardConfiguration(input);

  if (errors.length > 0) {
    return err(errors[0]);
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const slotTemplates = normalizeSlotTemplates(input.slotTemplates);
  const previousEntries = new Map(
    (normalizedPlan.board?.days ?? []).map((day) => [day.id, day.entries]),
  );
  const days = createBoardDays(normalizedPlan, input).map((day) => ({
    ...day,
    entries: previousEntries.get(day.id) ?? [],
  }));

  return ok({
    ...normalizedPlan,
    board: {
      preset: input.preset,
      startDate: normalizeOptionalText(input.startDate),
      slotTemplates,
      days,
    },
  });
}

export function addLoopDay(plan: MealPlan, input: LoopDayInput): Result<MealPlan, MealPlanError> {
  if (input.id.trim().length === 0) {
    return err(mealPlanError("day-id-required", "Loop day id is required.", "day.id"));
  }

  if (input.label.trim().length === 0) {
    return err(mealPlanError("day-label-required", "Loop day label is required.", "day.label"));
  }

  const normalizedPlan = normalizeMealPlan(plan);

  return ok({
    ...normalizedPlan,
    loopDays: [
      ...normalizedPlan.loopDays,
      {
        id: input.id.trim(),
        label: input.label.trim(),
        preset: input.preset,
        entries: [],
      },
    ],
  });
}

export function addMealPlanEntry(
  plan: MealPlan,
  dayId: string,
  input: MealPlanEntryInput,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const day = findLoopDay(normalizedPlan, dayId);

  if (!day) {
    return err(mealPlanError("day-not-found", "Loop day was not found.", "dayId"));
  }

  const entryErrors = validateEntry(input, "entry");

  if (entryErrors.length > 0) {
    return err(entryErrors[0]);
  }

  return ok(
    updateLoopDay(normalizedPlan, dayId, (loopDay) => ({
      ...loopDay,
      entries: [...loopDay.entries, normalizeEntry(input)],
    })),
  );
}

export function addPlannerBoardEntry(
  plan: MealPlan,
  dayId: string,
  input: PlannerBoardEntryInput,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const board = normalizedPlan.board;
  const day = findPlannerBoardDay(normalizedPlan, dayId);

  if (!board || !day) {
    return err(mealPlanError("board-day-not-found", "Planner board day was not found.", "dayId"));
  }

  const entryErrors = validateBoardEntry(input, "board.entry", board);

  if (entryErrors.length > 0) {
    return err(entryErrors[0]);
  }

  return ok(
    updatePlannerBoardDay(normalizedPlan, dayId, (bucket) => ({
      ...bucket,
      entries: [...bucket.entries, normalizeBoardEntry(input)],
    })),
  );
}

export function changeMealPlanEntryServings(
  plan: MealPlan,
  entryId: string,
  servings: number,
): Result<MealPlan, MealPlanError> {
  if (!isPositiveNumber(servings)) {
    return err(
      mealPlanError("servings-invalid", "Servings must be greater than zero.", "servings"),
    );
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const entryLocation = findEntryLocation(normalizedPlan, entryId);

  if (!entryLocation) {
    return err(mealPlanError("entry-not-found", "Plan entry was not found.", "entryId"));
  }

  return ok(
    updateLoopDay(normalizedPlan, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              servings,
            }
          : entry,
      ),
    })),
  );
}

export function changePlannerBoardEntryServings(
  plan: MealPlan,
  entryId: string,
  servings: number,
): Result<MealPlan, MealPlanError> {
  if (!isPositiveNumber(servings)) {
    return err(
      mealPlanError("servings-invalid", "Servings must be greater than zero.", "servings"),
    );
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const entryLocation = findPlannerBoardEntryLocation(normalizedPlan, entryId);

  if (!entryLocation) {
    return err(
      mealPlanError("board-entry-not-found", "Planner board entry was not found.", "entryId"),
    );
  }

  return ok(
    updatePlannerBoardDay(normalizedPlan, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              servings,
            }
          : entry,
      ),
    })),
  );
}

export function removeMealPlanEntry(
  plan: MealPlan,
  entryId: string,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const entryLocation = findEntryLocation(normalizedPlan, entryId);

  if (!entryLocation) {
    return err(mealPlanError("entry-not-found", "Plan entry was not found.", "entryId"));
  }

  return ok(
    updateLoopDay(normalizedPlan, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.filter((entry) => entry.id !== entryId),
    })),
  );
}

export function removePlannerBoardEntry(
  plan: MealPlan,
  entryId: string,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const entryLocation = findPlannerBoardEntryLocation(normalizedPlan, entryId);

  if (!entryLocation) {
    return err(
      mealPlanError("board-entry-not-found", "Planner board entry was not found.", "entryId"),
    );
  }

  return ok(
    updatePlannerBoardDay(normalizedPlan, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.filter((entry) => entry.id !== entryId),
    })),
  );
}

export function moveMealPlanEntry(
  plan: MealPlan,
  entryId: string,
  targetDayId: string,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const entryLocation = findEntryLocation(normalizedPlan, entryId);
  const targetDay = findLoopDay(normalizedPlan, targetDayId);

  if (!entryLocation) {
    return err(mealPlanError("entry-not-found", "Plan entry was not found.", "entryId"));
  }

  if (!targetDay) {
    return err(mealPlanError("day-not-found", "Target loop day was not found.", "targetDayId"));
  }

  const withoutEntry = updateLoopDay(normalizedPlan, entryLocation.day.id, (day) => ({
    ...day,
    entries: day.entries.filter((entry) => entry.id !== entryId),
  }));

  return ok(
    updateLoopDay(withoutEntry, targetDayId, (day) => ({
      ...day,
      entries: [...day.entries, entryLocation.entry],
    })),
  );
}

export function movePlannerBoardEntry(
  plan: MealPlan,
  entryId: string,
  input: PlannerBoardMoveInput,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const board = normalizedPlan.board;
  const entryLocation = findPlannerBoardEntryLocation(normalizedPlan, entryId);
  const targetDay = findPlannerBoardDay(normalizedPlan, input.targetDayId);

  if (!board) {
    return err(mealPlanError("board-day-not-found", "Planner board was not found.", "board"));
  }

  if (!entryLocation) {
    return err(
      mealPlanError("board-entry-not-found", "Planner board entry was not found.", "entryId"),
    );
  }

  if (!targetDay) {
    return err(
      mealPlanError(
        "board-day-not-found",
        "Target planner board day was not found.",
        "targetDayId",
      ),
    );
  }

  const targetSlot = normalizeMoveTarget(input, board);

  if (!targetSlot.ok) {
    return targetSlot;
  }

  const withoutEntry = updatePlannerBoardDay(normalizedPlan, entryLocation.day.id, (day) => ({
    ...day,
    entries: day.entries.filter((entry) => entry.id !== entryId),
  }));

  return ok(
    updatePlannerBoardDay(withoutEntry, input.targetDayId, (day) => ({
      ...day,
      entries: [
        ...day.entries,
        normalizeBoardEntry({
          ...entryLocation.entry,
          slotId: targetSlot.value.slotId,
          customSlotLabel: targetSlot.value.customSlotLabel,
        }),
      ],
    })),
  );
}

export function findLoopDay(plan: MealPlan, dayId: string) {
  return normalizeMealPlan(plan).loopDays.find((day) => day.id === dayId);
}

export function findPlannerBoardDay(plan: MealPlan, dayId: string) {
  return normalizeMealPlan(plan).board?.days.find((day) => day.id === dayId);
}

export function getEmptyLoopDays(plan: MealPlan) {
  return normalizeMealPlan(plan).loopDays.filter((day) => day.entries.length === 0);
}

export function getEmptyPlannerBoardDays(plan: MealPlan) {
  return normalizeMealPlan(plan).board?.days.filter((day) => day.entries.length === 0) ?? [];
}

function validateMealPlanInput(input: MealPlanInput): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (input.id.trim().length === 0) {
    errors.push(mealPlanError("plan-id-required", "Plan id is required.", "id"));
  }

  if (input.name.trim().length === 0) {
    errors.push(mealPlanError("plan-name-required", "Plan name is required.", "name"));
  }

  if (input.createdAt.trim().length === 0) {
    errors.push(mealPlanError("plan-date-required", "Created date is required.", "createdAt"));
  }

  if (input.updatedAt.trim().length === 0) {
    errors.push(mealPlanError("plan-date-required", "Updated date is required.", "updatedAt"));
  }

  (input.loopDays ?? []).forEach((day, index) => {
    validateLoopDay(day, `loopDays.${index}`).forEach((error) => errors.push(error));
  });

  if (input.board) {
    validatePlannerBoard(input.board, "board").forEach((error) => errors.push(error));
  }

  return errors;
}

function validateLoopDay(day: LoopDay, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (day.id.trim().length === 0) {
    errors.push(mealPlanError("day-id-required", "Loop day id is required.", `${path}.id`));
  }

  if (day.label.trim().length === 0) {
    errors.push(
      mealPlanError("day-label-required", "Loop day label is required.", `${path}.label`),
    );
  }

  day.entries.forEach((entry, entryIndex) => {
    errors.push(...validateEntry(entry, `${path}.entries.${entryIndex}`));
  });

  return errors;
}

function validateBoardConfiguration(input: PlannerBoardConfigurationInput): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (!plannerBoardPresets.includes(input.preset)) {
    errors.push(
      mealPlanError("board-preset-invalid", "Planner board preset is invalid.", "board.preset"),
    );
  }

  if (input.startDate && !isValidLocalDate(input.startDate)) {
    errors.push(
      mealPlanError(
        "board-date-invalid",
        "Planner board start date must use YYYY-MM-DD.",
        "board.startDate",
      ),
    );
  }

  normalizeSlotTemplates(input.slotTemplates).forEach((slot, index) => {
    errors.push(...validateSlotTemplate(slot, `board.slotTemplates.${index}`));
  });

  return errors;
}

function validatePlannerBoard(board: PlannerBoard, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];
  const slotIds = new Set(board.slotTemplates.map((slot) => slot.id));

  if (!plannerBoardPresets.includes(board.preset)) {
    errors.push(mealPlanError("board-preset-invalid", "Planner board preset is invalid.", path));
  }

  if (board.startDate && !isValidLocalDate(board.startDate)) {
    errors.push(
      mealPlanError("board-date-invalid", "Planner board start date must use YYYY-MM-DD.", path),
    );
  }

  board.slotTemplates.forEach((slot, index) => {
    errors.push(...validateSlotTemplate(slot, `${path}.slotTemplates.${index}`));
  });

  board.days.forEach((day, dayIndex) => {
    if (day.id.trim().length === 0) {
      errors.push(
        mealPlanError(
          "board-day-id-required",
          "Planner board day id is required.",
          `${path}.days.${dayIndex}.id`,
        ),
      );
    }

    if (day.label.trim().length === 0) {
      errors.push(
        mealPlanError(
          "board-day-label-required",
          "Planner board day label is required.",
          `${path}.days.${dayIndex}.label`,
        ),
      );
    }

    if (day.date && !isValidLocalDate(day.date)) {
      errors.push(
        mealPlanError(
          "board-date-invalid",
          "Planner board day date must use YYYY-MM-DD.",
          `${path}.days.${dayIndex}.date`,
        ),
      );
    }

    day.entries.forEach((entry, entryIndex) => {
      errors.push(
        ...validateBoardEntry(
          entry,
          `${path}.days.${dayIndex}.entries.${entryIndex}`,
          board,
          slotIds,
        ),
      );
    });
  });

  return errors;
}

function validateSlotTemplate(slot: PlannerSlotTemplate, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (slot.id.trim().length === 0) {
    errors.push(
      mealPlanError("board-slot-id-required", "Planner slot id is required.", `${path}.id`),
    );
  }

  if (slot.label.trim().length === 0) {
    errors.push(
      mealPlanError(
        "board-slot-label-required",
        "Planner slot label is required.",
        `${path}.label`,
      ),
    );
  }

  return errors;
}

function validateEntry(entry: MealPlanEntryInput, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (entry.id.trim().length === 0) {
    errors.push(mealPlanError("entry-id-required", "Entry id is required.", `${path}.id`));
  }

  if (entry.recipeId.trim().length === 0) {
    errors.push(mealPlanError("recipe-id-required", "Recipe id is required.", `${path}.recipeId`));
  }

  if (!isPositiveNumber(entry.servings)) {
    errors.push(
      mealPlanError("servings-invalid", "Servings must be greater than zero.", `${path}.servings`),
    );
  }

  return errors;
}

function validateBoardEntry(
  entry: PlannerBoardEntryInput,
  path: string,
  board: PlannerBoard,
  slotIds = new Set(board.slotTemplates.map((slot) => slot.id)),
): MealPlanError[] {
  const errors = validateEntry(entry, path);

  if (entry.slotId && !slotIds.has(entry.slotId)) {
    errors.push(
      mealPlanError("board-slot-not-found", "Planner slot was not found.", `${path}.slotId`),
    );
  }

  if (entry.context && !plannedMealContexts.includes(entry.context)) {
    errors.push(
      mealPlanError(
        "board-context-invalid",
        "Planner entry context is invalid.",
        `${path}.context`,
      ),
    );
  }

  return errors;
}

function normalizeLoopDay(day: LoopDay): LoopDay {
  return {
    id: day.id.trim(),
    label: day.label.trim(),
    preset: day.preset,
    entries: day.entries.map(normalizeEntry),
  };
}

function normalizeEntry(entry: MealPlanEntryInput): MealPlanEntry {
  return {
    id: entry.id.trim(),
    recipeId: entry.recipeId.trim(),
    servings: entry.servings,
  };
}

function normalizePlannerBoard(board: PlannerBoard): PlannerBoard {
  const slotTemplates = normalizeSlotTemplates(board.slotTemplates);

  return {
    preset: board.preset,
    startDate: normalizeOptionalText(board.startDate),
    slotTemplates,
    days: board.days.map((day) => ({
      id: day.id.trim(),
      label: day.label.trim(),
      date: normalizeOptionalText(day.date),
      entries: day.entries.map(normalizeBoardEntry),
    })),
  };
}

function normalizeBoardEntry(entry: PlannerBoardEntryInput): PlannerBoardEntry {
  const slotId = normalizeOptionalText(entry.slotId);
  const customSlotLabel = normalizeOptionalText(entry.customSlotLabel);

  return {
    id: entry.id.trim(),
    recipeId: entry.recipeId.trim(),
    servings: entry.servings,
    ...(slotId ? { slotId } : {}),
    ...(customSlotLabel ? { customSlotLabel } : {}),
    ...(entry.context ? { context: entry.context } : {}),
  };
}

function normalizeSlotTemplates(
  slotTemplates: ReadonlyArray<PlannerSlotTemplate> | undefined,
): ReadonlyArray<PlannerSlotTemplate> {
  const source =
    slotTemplates && slotTemplates.length > 0 ? slotTemplates : DEFAULT_PLANNER_SLOT_TEMPLATES;

  return source.map((slot, index) => {
    const label = slot.label.trim();
    return {
      id: slot.id.trim() || createStableId("slot", label, index),
      label,
    };
  });
}

function createFallbackPlannerBoard(loopDays: ReadonlyArray<LoopDay>): PlannerBoard {
  const days =
    loopDays.length > 0
      ? loopDays.map((day) => ({
          id: day.id,
          label: day.label,
          entries: day.entries.map((entry) => ({
            ...entry,
            context: "eat" as const,
          })),
        }))
      : createBoardDays(
          {
            id: "fallback-plan",
            name: "Fallback plan",
            loopDays: [],
            createdAt: "fallback",
            updatedAt: "fallback",
          },
          { preset: "customLoop" },
        );

  return {
    preset: "customLoop",
    slotTemplates: DEFAULT_PLANNER_SLOT_TEMPLATES,
    days,
  };
}

function createBoardDays(
  plan: MealPlanInput | MealPlan,
  input: PlannerBoardConfigurationInput,
): ReadonlyArray<PlannerDayBucket> {
  const startDate = normalizeOptionalText(input.startDate);

  if (input.preset === "customLoop") {
    const labels =
      input.customDayLabels?.map((label) => label.trim()).filter(Boolean) ??
      plan.loopDays?.map((day) => day.label).filter(Boolean) ??
      defaultCustomLoopLabels;

    return labels.length > 0
      ? labels.map((label, index) => createDayBucket(label, index, startDate))
      : defaultCustomLoopLabels.map((label, index) => createDayBucket(label, index, startDate));
  }

  if (input.preset === "weekly") {
    return weeklyLabels.map((label, index) => createDayBucket(label, index, startDate));
  }

  if (input.preset === "rolling7") {
    return Array.from({ length: 7 }, (_, index) =>
      createDayBucket(`Day ${index + 1}`, index, startDate),
    );
  }

  return Array.from({ length: 30 }, (_, index) =>
    createDayBucket(`Day ${index + 1}`, index, startDate),
  );
}

function createDayBucket(
  label: string,
  index: number,
  startDate: string | undefined,
): PlannerDayBucket {
  return {
    id: createStableId("board-day", label, index),
    label,
    ...(startDate ? { date: addDaysToLocalDate(startDate, index) } : {}),
    entries: [],
  };
}

function updateLoopDay(plan: MealPlan, dayId: string, update: (day: LoopDay) => LoopDay): MealPlan {
  return {
    ...plan,
    loopDays: plan.loopDays.map((day) => (day.id === dayId ? update(day) : day)),
  };
}

function updatePlannerBoardDay(
  plan: MealPlan,
  dayId: string,
  update: (day: PlannerDayBucket) => PlannerDayBucket,
): MealPlan {
  const board = normalizeMealPlan(plan).board;

  if (!board) {
    return plan;
  }

  return {
    ...plan,
    board: {
      ...board,
      days: board.days.map((day) => (day.id === dayId ? update(day) : day)),
    },
  };
}

function findEntryLocation(
  plan: MealPlan,
  entryId: string,
): { day: LoopDay; entry: MealPlanEntry } | undefined {
  for (const day of plan.loopDays) {
    const entry = day.entries.find((candidate) => candidate.id === entryId);

    if (entry) {
      return { day, entry };
    }
  }

  return undefined;
}

function findPlannerBoardEntryLocation(
  plan: MealPlan,
  entryId: string,
): { day: PlannerDayBucket; entry: PlannerBoardEntry } | undefined {
  const board = plan.board;

  if (!board) {
    return undefined;
  }

  for (const day of board.days) {
    const entry = day.entries.find((candidate) => candidate.id === entryId);

    if (entry) {
      return { day, entry };
    }
  }

  return undefined;
}

function normalizeMoveTarget(
  input: PlannerBoardMoveInput,
  board: PlannerBoard,
): Result<Pick<PlannerBoardEntry, "slotId" | "customSlotLabel">, MealPlanError> {
  const slotId = normalizeOptionalText(input.targetSlotId);
  const customSlotLabel = normalizeOptionalText(input.targetCustomSlotLabel);

  if (slotId && !board.slotTemplates.some((slot) => slot.id === slotId)) {
    return err(
      mealPlanError("board-slot-not-found", "Planner slot was not found.", "targetSlotId"),
    );
  }

  return ok({
    ...(slotId ? { slotId } : {}),
    ...(customSlotLabel ? { customSlotLabel } : {}),
  });
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function isPositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isValidLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function addDaysToLocalDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function createStableId(prefix: string, label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${prefix}-${slug || "item"}-${index + 1}`;
}

function mealPlanError(code: MealPlanErrorCode, message: string, path: string): MealPlanError {
  return {
    code,
    message,
    path,
  };
}
