import { err, ok, type Result } from "../../../core/result/Result";

export type LoopDayPreset = "training" | "nonTraining" | "custom";

export type PlannerBoardPreset = "weekly" | "rolling7" | "month" | "customLoop";

export type PlannedMealEntryContext = "cook" | "eat" | "prep";
export type MealPlanScheduleMode = "weekly" | "customLoop" | "individualDates";
export type PlannerNutritionMetric = "calories" | "protein" | "fat" | "carbs";
export type PlannerNutritionTargets = Partial<Record<PlannerNutritionMetric, number>>;

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

export type MealPlanScheduledEntry = {
  id: string;
  recipeId: string;
  servings: number;
  slotLabel?: string;
  context?: PlannedMealEntryContext;
};

export type MealPlanDayDefinition = {
  id: string;
  label: string;
  entries: ReadonlyArray<MealPlanScheduledEntry>;
  targets?: PlannerNutritionTargets;
};

export type MealPlanDateDefinition = MealPlanDayDefinition & {
  date: string;
};

export type MealPlanSchedule =
  | {
      mode: "weekly";
      startDate?: string;
      days: ReadonlyArray<MealPlanDayDefinition>;
    }
  | {
      mode: "customLoop";
      startDate: string;
      days: ReadonlyArray<MealPlanDayDefinition>;
    }
  | {
      mode: "individualDates";
      days: ReadonlyArray<MealPlanDateDefinition>;
    };

export type MealPlanDateEntryServingOverride = {
  entryId: string;
  servings: number;
};

export type MealPlanDateState = {
  date: string;
  eatenEntryIds: ReadonlyArray<string>;
  servingOverrides: ReadonlyArray<MealPlanDateEntryServingOverride>;
};

export type MealPlan = {
  id: string;
  name: string;
  loopDays: ReadonlyArray<LoopDay>;
  board?: PlannerBoard;
  schedule?: MealPlanSchedule;
  dateStates?: ReadonlyArray<MealPlanDateState>;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanInput = {
  id: string;
  name: string;
  loopDays?: ReadonlyArray<LoopDay>;
  board?: PlannerBoard;
  schedule?: MealPlanSchedule;
  dateStates?: ReadonlyArray<MealPlanDateState>;
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

export type MealPlanScheduleConfigurationInput = {
  mode: MealPlanScheduleMode;
  startDate?: string;
  dayLabels?: ReadonlyArray<string>;
  individualDates?: ReadonlyArray<string>;
};

export type MealPlanScheduledEntryInput = MealPlanScheduledEntry;

export type PlannerRecipeNutrition = {
  id: string;
  title?: string;
  baseServings: number;
  nutrition?: Partial<Record<PlannerNutritionMetric, { amount: number; unit: string }>>;
};

export type MealPlanCalendarEntry = MealPlanScheduledEntry & {
  title?: string;
  effectiveServings: number;
  eaten: boolean;
  nutrition: PlannerNutritionTargets;
};

export type MealPlanCalendarDaySummary = {
  date: string;
  label: string;
  sourceDayId?: string;
  targets: PlannerNutritionTargets;
  entries: ReadonlyArray<MealPlanCalendarEntry>;
  plannedTotals: PlannerNutritionTargets;
  eatenTotals: PlannerNutritionTargets;
  leftToTarget: PlannerNutritionTargets;
  plannedLeft: PlannerNutritionTargets;
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
  | "board-context-invalid"
  | "schedule-mode-invalid"
  | "schedule-date-invalid"
  | "schedule-day-id-required"
  | "schedule-day-label-required"
  | "schedule-day-not-found"
  | "schedule-entry-not-found"
  | "schedule-target-invalid";

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
const mealPlanScheduleModes: ReadonlyArray<MealPlanScheduleMode> = [
  "weekly",
  "customLoop",
  "individualDates",
];
const plannerNutritionMetrics: ReadonlyArray<PlannerNutritionMetric> = [
  "calories",
  "protein",
  "fat",
  "carbs",
];

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
    schedule: input.schedule
      ? normalizeMealPlanSchedule(input.schedule)
      : createFallbackMealPlanSchedule(input, normalizedLoopDays),
    dateStates: (input.dateStates ?? []).map(normalizeMealPlanDateState),
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

export function configureMealPlanSchedule(
  plan: MealPlan,
  input: MealPlanScheduleConfigurationInput,
): Result<MealPlan, MealPlanError> {
  const errors = validateScheduleConfiguration(input);

  if (errors.length > 0) {
    return err(errors[0]);
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const previousDays = new Map(
    (normalizedPlan.schedule ? scheduleDays(normalizedPlan.schedule) : []).map((day) => [
      day.id,
      day,
    ]),
  );
  const schedule = createScheduleFromConfiguration(normalizedPlan, input, previousDays);

  return ok({
    ...normalizedPlan,
    schedule,
  });
}

export function updateMealPlanDayTargets(
  plan: MealPlan,
  dayId: string,
  targets: PlannerNutritionTargets,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const schedule = normalizedPlan.schedule;

  if (!schedule) {
    return err(mealPlanError("schedule-day-not-found", "Schedule is not configured.", "schedule"));
  }

  const targetErrors = validateTargets(targets, "schedule.targets");

  if (targetErrors.length > 0) {
    return err(targetErrors[0]);
  }

  if (!scheduleDays(schedule).some((day) => day.id === dayId)) {
    return err(mealPlanError("schedule-day-not-found", "Schedule day was not found.", "dayId"));
  }

  return ok({
    ...normalizedPlan,
    schedule: updateScheduleDay(schedule, dayId, (day) => ({
      ...day,
      targets: normalizeTargets(targets),
    })),
  });
}

export function addMealPlanScheduleEntry(
  plan: MealPlan,
  dayId: string,
  input: MealPlanScheduledEntryInput,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const schedule = normalizedPlan.schedule;

  if (!schedule) {
    return err(mealPlanError("schedule-day-not-found", "Schedule is not configured.", "schedule"));
  }

  const entryErrors = validateScheduledEntry(input, "schedule.entry");

  if (entryErrors.length > 0) {
    return err(entryErrors[0]);
  }

  if (!scheduleDays(schedule).some((day) => day.id === dayId)) {
    return err(mealPlanError("schedule-day-not-found", "Schedule day was not found.", "dayId"));
  }

  return ok({
    ...normalizedPlan,
    schedule: updateScheduleDay(schedule, dayId, (day) => ({
      ...day,
      entries: [...day.entries, normalizeScheduledEntry(input)],
    })),
  });
}

export function changeMealPlanScheduleEntryServings(
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
  const schedule = normalizedPlan.schedule;
  const entryLocation = schedule ? findScheduleEntryLocation(schedule, entryId) : undefined;

  if (!schedule || !entryLocation) {
    return err(
      mealPlanError("schedule-entry-not-found", "Schedule entry was not found.", "entryId"),
    );
  }

  return ok({
    ...normalizedPlan,
    schedule: updateScheduleDay(schedule, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.map((entry) => (entry.id === entryId ? { ...entry, servings } : entry)),
    })),
  });
}

export function removeMealPlanScheduleEntry(
  plan: MealPlan,
  entryId: string,
): Result<MealPlan, MealPlanError> {
  const normalizedPlan = normalizeMealPlan(plan);
  const schedule = normalizedPlan.schedule;
  const entryLocation = schedule ? findScheduleEntryLocation(schedule, entryId) : undefined;

  if (!schedule || !entryLocation) {
    return err(
      mealPlanError("schedule-entry-not-found", "Schedule entry was not found.", "entryId"),
    );
  }

  return ok({
    ...normalizedPlan,
    schedule: updateScheduleDay(schedule, entryLocation.day.id, (day) => ({
      ...day,
      entries: day.entries.filter((entry) => entry.id !== entryId),
    })),
  });
}

export function setMealPlanDateEntryEaten(
  plan: MealPlan,
  date: string,
  entryId: string,
  eaten: boolean,
): Result<MealPlan, MealPlanError> {
  const dateError = validateDateStateTarget(plan, date, entryId);

  if (dateError) {
    return err(dateError);
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const dateStates = upsertDateState(normalizedPlan.dateStates ?? [], date, (state) => {
    const eatenEntryIds = eaten
      ? Array.from(new Set([...state.eatenEntryIds, entryId]))
      : state.eatenEntryIds.filter((candidate) => candidate !== entryId);

    return {
      ...state,
      eatenEntryIds,
    };
  });

  return ok({
    ...normalizedPlan,
    dateStates,
  });
}

export function setMealPlanDateEntryServings(
  plan: MealPlan,
  date: string,
  entryId: string,
  servings: number,
): Result<MealPlan, MealPlanError> {
  if (!isPositiveNumber(servings)) {
    return err(
      mealPlanError("servings-invalid", "Servings must be greater than zero.", "servings"),
    );
  }

  const dateError = validateDateStateTarget(plan, date, entryId);

  if (dateError) {
    return err(dateError);
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const dateStates = upsertDateState(normalizedPlan.dateStates ?? [], date, (state) => ({
    ...state,
    servingOverrides: [
      ...state.servingOverrides.filter((override) => override.entryId !== entryId),
      { entryId, servings },
    ],
  }));

  return ok({
    ...normalizedPlan,
    dateStates,
  });
}

export function resolveMealPlanCalendarDay(
  plan: MealPlan,
  recipes: ReadonlyArray<PlannerRecipeNutrition>,
  date: string,
): MealPlanCalendarDaySummary {
  const normalizedPlan = normalizeMealPlan(plan);
  const sourceDay = resolveScheduleDayForDate(normalizedPlan.schedule, date);
  const dateState = (normalizedPlan.dateStates ?? []).find((state) => state.date === date);

  if (!sourceDay) {
    return emptyCalendarDay(date);
  }

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const overrides = new Map(
    (dateState?.servingOverrides ?? []).map((override) => [override.entryId, override.servings]),
  );
  const eatenEntryIds = new Set(dateState?.eatenEntryIds ?? []);
  const entries = sourceDay.entries.map((entry) => {
    const effectiveServings = overrides.get(entry.id) ?? entry.servings;
    const recipe = recipesById.get(entry.recipeId);
    const nutrition = recipe
      ? plannedNutritionForRecipe(recipe, effectiveServings)
      : emptyTargets();

    return {
      ...entry,
      title: recipe?.title,
      effectiveServings,
      eaten: eatenEntryIds.has(entry.id),
      nutrition,
    };
  });
  const plannedTotals = sumEntryNutrition(entries);
  const eatenTotals = sumEntryNutrition(entries.filter((entry) => entry.eaten));
  const targets = sourceDay.targets ?? emptyTargets();

  return {
    date,
    label: sourceDay.label,
    sourceDayId: sourceDay.id,
    targets,
    entries,
    plannedTotals,
    eatenTotals,
    leftToTarget: subtractTargets(targets, eatenTotals),
    plannedLeft: subtractTargets(plannedTotals, eatenTotals),
  };
}

export function resolveMealPlanCalendarRange(
  plan: MealPlan,
  recipes: ReadonlyArray<PlannerRecipeNutrition>,
  startDate: string,
  dayCount: number,
): ReadonlyArray<MealPlanCalendarDaySummary> {
  if (!isValidLocalDate(startDate) || !Number.isInteger(dayCount) || dayCount <= 0) {
    return [];
  }

  return Array.from({ length: dayCount }, (_, index) =>
    resolveMealPlanCalendarDay(plan, recipes, addDaysToLocalDate(startDate, index)),
  );
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

  if (input.schedule) {
    validateMealPlanSchedule(input.schedule, "schedule").forEach((error) => errors.push(error));
  }

  (input.dateStates ?? []).forEach((state, index) => {
    validateMealPlanDateState(state, `dateStates.${index}`).forEach((error) => errors.push(error));
  });

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

function validateScheduleConfiguration(input: MealPlanScheduleConfigurationInput): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (!mealPlanScheduleModes.includes(input.mode)) {
    errors.push(
      mealPlanError("schedule-mode-invalid", "Planner schedule mode is invalid.", "schedule.mode"),
    );
  }

  if (input.startDate && !isValidLocalDate(input.startDate)) {
    errors.push(
      mealPlanError(
        "schedule-date-invalid",
        "Planner schedule start date must use YYYY-MM-DD.",
        "schedule.startDate",
      ),
    );
  }

  if (input.individualDates) {
    input.individualDates.forEach((date, index) => {
      if (!isValidLocalDate(date)) {
        errors.push(
          mealPlanError(
            "schedule-date-invalid",
            "Individual planner dates must use YYYY-MM-DD.",
            `schedule.individualDates.${index}`,
          ),
        );
      }
    });
  }

  return errors;
}

function validateMealPlanSchedule(schedule: MealPlanSchedule, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (!mealPlanScheduleModes.includes(schedule.mode)) {
    errors.push(mealPlanError("schedule-mode-invalid", "Schedule mode is invalid.", path));
  }

  if ("startDate" in schedule && schedule.startDate && !isValidLocalDate(schedule.startDate)) {
    errors.push(
      mealPlanError(
        "schedule-date-invalid",
        "Schedule start date must use YYYY-MM-DD.",
        `${path}.startDate`,
      ),
    );
  }

  if (schedule.mode === "customLoop" && !isValidLocalDate(schedule.startDate)) {
    errors.push(
      mealPlanError(
        "schedule-date-invalid",
        "Custom loop needs a valid YYYY-MM-DD start date.",
        `${path}.startDate`,
      ),
    );
  }

  if (schedule.mode === "individualDates") {
    schedule.days.forEach((day, index) => {
      errors.push(...validateScheduleDay(day, `${path}.days.${index}`));

      if (!isValidLocalDate(day.date)) {
        errors.push(
          mealPlanError(
            "schedule-date-invalid",
            "Individual planner day date must use YYYY-MM-DD.",
            `${path}.days.${index}.date`,
          ),
        );
      }
    });
  } else {
    schedule.days.forEach((day, index) => {
      errors.push(...validateScheduleDay(day, `${path}.days.${index}`));
    });
  }

  return errors;
}

function validateScheduleDay(day: MealPlanDayDefinition, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (day.id.trim().length === 0) {
    errors.push(
      mealPlanError("schedule-day-id-required", "Schedule day id is required.", `${path}.id`),
    );
  }

  if (day.label.trim().length === 0) {
    errors.push(
      mealPlanError(
        "schedule-day-label-required",
        "Schedule day label is required.",
        `${path}.label`,
      ),
    );
  }

  day.entries.forEach((entry, index) => {
    errors.push(...validateScheduledEntry(entry, `${path}.entries.${index}`));
  });
  errors.push(...validateTargets(day.targets ?? {}, `${path}.targets`));

  return errors;
}

function validateScheduledEntry(entry: MealPlanScheduledEntryInput, path: string): MealPlanError[] {
  const errors = validateEntry(entry, path);

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

function validateTargets(targets: PlannerNutritionTargets, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  plannerNutritionMetrics.forEach((metric) => {
    const value = targets[metric];

    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      errors.push(
        mealPlanError(
          "schedule-target-invalid",
          "Planner nutrition targets must be zero or greater.",
          `${path}.${metric}`,
        ),
      );
    }
  });

  return errors;
}

function validateMealPlanDateState(state: MealPlanDateState, path: string): MealPlanError[] {
  const errors: MealPlanError[] = [];

  if (!isValidLocalDate(state.date)) {
    errors.push(
      mealPlanError("schedule-date-invalid", "Planner state date must use YYYY-MM-DD.", path),
    );
  }

  state.servingOverrides.forEach((override, index) => {
    if (override.entryId.trim().length === 0) {
      errors.push(
        mealPlanError(
          "schedule-entry-not-found",
          "Serving override entry id is required.",
          `${path}.servingOverrides.${index}.entryId`,
        ),
      );
    }

    if (!isPositiveNumber(override.servings)) {
      errors.push(
        mealPlanError(
          "servings-invalid",
          "Serving override must be greater than zero.",
          `${path}.servingOverrides.${index}.servings`,
        ),
      );
    }
  });

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

function normalizeMealPlanSchedule(schedule: MealPlanSchedule): MealPlanSchedule {
  if (schedule.mode === "individualDates") {
    return {
      mode: "individualDates",
      days: schedule.days.map((day) => ({
        ...normalizeScheduleDay(day),
        date: day.date.trim(),
      })),
    };
  }

  if (schedule.mode === "weekly") {
    return {
      mode: "weekly",
      startDate: normalizeOptionalText(schedule.startDate),
      days: schedule.days.map(normalizeScheduleDay),
    };
  }

  return {
    mode: "customLoop",
    startDate: schedule.startDate.trim(),
    days: schedule.days.map(normalizeScheduleDay),
  };
}

function normalizeScheduleDay(day: MealPlanDayDefinition): MealPlanDayDefinition {
  return {
    id: day.id.trim(),
    label: day.label.trim(),
    entries: day.entries.map(normalizeScheduledEntry),
    targets: normalizeTargets(day.targets ?? {}),
  };
}

function normalizeScheduledEntry(entry: MealPlanScheduledEntryInput): MealPlanScheduledEntry {
  return {
    id: entry.id.trim(),
    recipeId: entry.recipeId.trim(),
    servings: entry.servings,
    ...(normalizeOptionalText(entry.slotLabel)
      ? { slotLabel: normalizeOptionalText(entry.slotLabel) }
      : {}),
    ...(entry.context ? { context: entry.context } : {}),
  };
}

function normalizeTargets(targets: PlannerNutritionTargets): PlannerNutritionTargets | undefined {
  const normalizedTargets: PlannerNutritionTargets = {};

  plannerNutritionMetrics.forEach((metric) => {
    const value = targets[metric];

    if (value !== undefined && Number.isFinite(value) && value >= 0) {
      normalizedTargets[metric] = value;
    }
  });

  return Object.keys(normalizedTargets).length > 0 ? normalizedTargets : undefined;
}

function normalizeMealPlanDateState(state: MealPlanDateState): MealPlanDateState {
  return {
    date: state.date.trim(),
    eatenEntryIds: Array.from(
      new Set(state.eatenEntryIds.map((entryId) => entryId.trim()).filter(Boolean)),
    ),
    servingOverrides: state.servingOverrides
      .filter(
        (override) => override.entryId.trim().length > 0 && isPositiveNumber(override.servings),
      )
      .map((override) => ({
        entryId: override.entryId.trim(),
        servings: override.servings,
      })),
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

function createFallbackMealPlanSchedule(
  input: MealPlanInput | MealPlan,
  loopDays: ReadonlyArray<LoopDay>,
): MealPlanSchedule {
  const fallbackDate = fallbackStartDate(input);

  if (input.board) {
    const board = normalizePlannerBoard(input.board);
    const days = board.days.map((day, index) => ({
      id: day.id,
      label: day.label,
      entries: day.entries.map((entry) => scheduledEntryFromBoardEntry(entry, board)),
      date: day.date ?? addDaysToLocalDate(board.startDate ?? fallbackDate, index),
    }));

    if (board.preset === "weekly") {
      return {
        mode: "weekly",
        startDate: board.startDate,
        days: days.map(toScheduleDayDefinition),
      };
    }

    if (board.preset === "customLoop") {
      return {
        mode: "customLoop",
        startDate: board.startDate ?? fallbackDate,
        days: days.map(toScheduleDayDefinition),
      };
    }

    return {
      mode: "individualDates",
      days,
    };
  }

  if (loopDays.length > 0) {
    return {
      mode: "customLoop",
      startDate: fallbackDate,
      days: loopDays.map((day) => ({
        id: day.id,
        label: day.label,
        entries: day.entries.map((entry) => ({
          id: entry.id,
          recipeId: entry.recipeId,
          servings: entry.servings,
          context: "eat" as const,
        })),
      })),
    };
  }

  return {
    mode: "customLoop",
    startDate: fallbackDate,
    days: defaultCustomLoopLabels.map((label, index) => ({
      id: createStableId("schedule-day", label, index),
      label,
      entries: [],
    })),
  };
}

function toScheduleDayDefinition(day: MealPlanDayDefinition): MealPlanDayDefinition {
  return {
    id: day.id,
    label: day.label,
    ...(day.targets ? { targets: day.targets } : {}),
    entries: day.entries,
  };
}

function createScheduleFromConfiguration(
  plan: MealPlan,
  input: MealPlanScheduleConfigurationInput,
  previousDays: ReadonlyMap<string, MealPlanDayDefinition>,
): MealPlanSchedule {
  const startDate = normalizeOptionalText(input.startDate) ?? fallbackStartDate(plan);

  if (input.mode === "weekly") {
    return {
      mode: "weekly",
      startDate,
      days: weeklyLabels.map((label, index) =>
        createConfiguredScheduleDay(label, index, previousDays),
      ),
    };
  }

  if (input.mode === "individualDates") {
    const sourceDates =
      input.individualDates && input.individualDates.length > 0
        ? input.individualDates
        : scheduleDays(plan.schedule)
            .filter((day): day is MealPlanDateDefinition => "date" in day)
            .map((day) => day.date);
    const dates = sourceDates.length > 0 ? sourceDates : [startDate];

    return {
      mode: "individualDates",
      days: dates.map((date, index) => {
        const label = date;
        return {
          ...createConfiguredScheduleDay(label, index, previousDays),
          date,
        };
      }),
    };
  }

  const labels =
    input.dayLabels?.map((label) => label.trim()).filter(Boolean) ??
    scheduleDays(plan.schedule)
      .map((day) => day.label)
      .filter(Boolean);
  const customLabels = labels.length > 0 ? labels : defaultCustomLoopLabels;

  return {
    mode: "customLoop",
    startDate,
    days: customLabels.map((label, index) =>
      createConfiguredScheduleDay(label, index, previousDays),
    ),
  };
}

function createConfiguredScheduleDay(
  label: string,
  index: number,
  previousDays: ReadonlyMap<string, MealPlanDayDefinition>,
): MealPlanDayDefinition {
  const id = createStableId("schedule-day", label, index);
  const previousDay = previousDays.get(id);

  return {
    id,
    label,
    entries: previousDay?.entries ?? [],
    targets: previousDay?.targets,
  };
}

function scheduledEntryFromBoardEntry(
  entry: PlannerBoardEntry,
  board: PlannerBoard,
): MealPlanScheduledEntry {
  const slotLabel =
    entry.customSlotLabel ??
    board.slotTemplates.find((slot) => slot.id === entry.slotId)?.label ??
    undefined;

  return {
    id: entry.id,
    recipeId: entry.recipeId,
    servings: entry.servings,
    ...(slotLabel ? { slotLabel } : {}),
    context: entry.context ?? "eat",
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

function scheduleDays(
  schedule: MealPlanSchedule | undefined,
): ReadonlyArray<MealPlanDayDefinition | MealPlanDateDefinition> {
  return schedule?.days ?? [];
}

function updateScheduleDay(
  schedule: MealPlanSchedule,
  dayId: string,
  update: (day: MealPlanDayDefinition) => MealPlanDayDefinition,
): MealPlanSchedule {
  if (schedule.mode === "individualDates") {
    return {
      mode: "individualDates",
      days: schedule.days.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        const updated = update(day);
        return {
          ...updated,
          date: day.date,
        };
      }),
    };
  }

  return {
    ...schedule,
    days: schedule.days.map((day) => (day.id === dayId ? update(day) : day)),
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

function findScheduleEntryLocation(
  schedule: MealPlanSchedule,
  entryId: string,
): { day: MealPlanDayDefinition; entry: MealPlanScheduledEntry } | undefined {
  for (const day of schedule.days) {
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

function validateDateStateTarget(
  plan: MealPlan,
  date: string,
  entryId: string,
): MealPlanError | undefined {
  if (!isValidLocalDate(date)) {
    return mealPlanError(
      "schedule-date-invalid",
      "Planner state date must use YYYY-MM-DD.",
      "date",
    );
  }

  const normalizedPlan = normalizeMealPlan(plan);
  const day = resolveScheduleDayForDate(normalizedPlan.schedule, date);

  if (!day || !day.entries.some((entry) => entry.id === entryId)) {
    return mealPlanError(
      "schedule-entry-not-found",
      "Schedule entry was not found for the selected date.",
      "entryId",
    );
  }

  return undefined;
}

function upsertDateState(
  states: ReadonlyArray<MealPlanDateState>,
  date: string,
  update: (state: MealPlanDateState) => MealPlanDateState,
): ReadonlyArray<MealPlanDateState> {
  const existingState = states.find((state) => state.date === date) ?? {
    date,
    eatenEntryIds: [],
    servingOverrides: [],
  };
  const nextState = normalizeMealPlanDateState(update(existingState));
  const remainingStates = states.filter((state) => state.date !== date);

  if (nextState.eatenEntryIds.length === 0 && nextState.servingOverrides.length === 0) {
    return remainingStates;
  }

  return [...remainingStates, nextState].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
}

function resolveScheduleDayForDate(
  schedule: MealPlanSchedule | undefined,
  date: string,
): MealPlanDayDefinition | undefined {
  if (!schedule || !isValidLocalDate(date) || schedule.days.length === 0) {
    return undefined;
  }

  if (schedule.mode === "individualDates") {
    return schedule.days.find((day) => day.date === date);
  }

  if (schedule.mode === "weekly") {
    return schedule.days[localWeekdayIndex(date) % schedule.days.length];
  }

  const offset = daysBetweenLocalDates(schedule.startDate, date);
  const index = positiveModulo(offset, schedule.days.length);
  return schedule.days[index];
}

function emptyCalendarDay(date: string): MealPlanCalendarDaySummary {
  return {
    date,
    label: date,
    targets: {},
    entries: [],
    plannedTotals: {},
    eatenTotals: {},
    leftToTarget: {},
    plannedLeft: {},
  };
}

function plannedNutritionForRecipe(
  recipe: PlannerRecipeNutrition,
  plannedServings: number,
): PlannerNutritionTargets {
  if (!isPositiveNumber(recipe.baseServings) || !isPositiveNumber(plannedServings)) {
    return {};
  }

  const totals: PlannerNutritionTargets = {};

  plannerNutritionMetrics.forEach((metric) => {
    const value = recipe.nutrition?.[metric];

    if (!value || !Number.isFinite(value.amount)) {
      return;
    }

    totals[metric] = (value.amount / recipe.baseServings) * plannedServings;
  });

  return totals;
}

function sumEntryNutrition(entries: ReadonlyArray<MealPlanCalendarEntry>) {
  const totals: PlannerNutritionTargets = {};

  entries.forEach((entry) => {
    plannerNutritionMetrics.forEach((metric) => {
      const value = entry.nutrition[metric];

      if (value === undefined) {
        return;
      }

      totals[metric] = (totals[metric] ?? 0) + value;
    });
  });

  return totals;
}

function subtractTargets(
  source: PlannerNutritionTargets,
  consumed: PlannerNutritionTargets,
): PlannerNutritionTargets {
  const totals: PlannerNutritionTargets = {};

  plannerNutritionMetrics.forEach((metric) => {
    const sourceValue = source[metric];

    if (sourceValue === undefined) {
      return;
    }

    totals[metric] = sourceValue - (consumed[metric] ?? 0);
  });

  return totals;
}

function emptyTargets(): PlannerNutritionTargets {
  return {};
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

function daysBetweenLocalDates(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86_400_000);
}

function localWeekdayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utcDay === 0 ? 6 : utcDay - 1;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function fallbackStartDate(input: Pick<MealPlanInput | MealPlan, "createdAt">) {
  const candidate = input.createdAt.slice(0, 10);
  return isValidLocalDate(candidate) ? candidate : "2026-01-01";
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
