import { useEffect, useMemo, useState } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { RecipeUseCases } from "../../recipes/application/recipeUseCases";
import { formatNutritionAmount } from "../../recipes/domain/nutrition";
import type { Recipe } from "../../recipes/domain/recipe";
import type { MealPlanUseCases } from "../application/mealPlanUseCases";
import {
  resolveMealPlanCalendarDay,
  resolveMealPlanCalendarRange,
  type MealPlan,
  type MealPlanCalendarDaySummary,
  type MealPlanDayDefinition,
  type MealPlanScheduleMode,
  type PlannedMealEntryContext,
  type PlannerNutritionMetric,
  type PlannerNutritionTargets,
} from "../domain/mealPlan";

type PlannerScreenProps = {
  mealPlanUseCases: MealPlanUseCases;
  recipeUseCases: RecipeUseCases;
  onChanged: () => void;
  onOpenRecipe?: (recipeId: string, servings: number, openCookMode: boolean) => void;
};

type PlannerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      plans: ReadonlyArray<MealPlan>;
      recipes: ReadonlyArray<Recipe>;
      selectedPlanId: string;
      error?: string;
    };

type CalendarView = "week" | "month";

type SetupDraft = {
  mode: MealPlanScheduleMode;
  startDate: string;
  dayLabels: string;
  individualDates: string;
};

type EntryDraft = {
  recipeId: string;
  servings: number;
  slotLabel: string;
  context: PlannedMealEntryContext;
};

type TargetDraft = Record<PlannerNutritionMetric, string>;

const nutritionMetrics: ReadonlyArray<{
  metric: PlannerNutritionMetric;
  label: string;
  unit: string;
}> = [
  { metric: "calories", label: "Calories", unit: "kcal" },
  { metric: "protein", label: "Protein", unit: "g" },
  { metric: "fat", label: "Fat", unit: "g" },
  { metric: "carbs", label: "Carbs", unit: "g" },
];

export function PlannerScreen({
  mealPlanUseCases,
  recipeUseCases,
  onChanged,
  onOpenRecipe,
}: PlannerScreenProps) {
  const [plannerState, setPlannerState] = useState<PlannerState>({ status: "loading" });
  const [setupOpen, setSetupOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState("");
  const [setupDraftOverride, setSetupDraftOverride] = useState<SetupDraft | undefined>();
  const [entryDrafts, setEntryDrafts] = useState<Record<string, EntryDraft>>({});
  const [targetDrafts, setTargetDrafts] = useState<Record<string, TargetDraft>>({});
  const [scheduleServingDrafts, setScheduleServingDrafts] = useState<Record<string, number>>({});
  const [dateServingDrafts, setDateServingDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    void loadPlanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlanUseCases, recipeUseCases]);

  const selectedPlan = useMemo(() => {
    if (plannerState.status !== "ready") {
      return undefined;
    }

    return plannerState.plans.find((plan) => plan.id === plannerState.selectedPlanId);
  }, [plannerState]);

  const activeDate = selectedDate || (selectedPlan ? anchorDateForPlan(selectedPlan) : "");
  const rangeStart = activeDate ? calendarRangeStart(activeDate, calendarView) : "";
  const calendarDays = useMemo(() => {
    if (!selectedPlan || plannerState.status !== "ready" || !rangeStart) {
      return [];
    }

    return resolveMealPlanCalendarRange(
      selectedPlan,
      plannerState.recipes,
      rangeStart,
      calendarView === "week" ? 7 : daysInMonth(rangeStart),
    );
  }, [calendarView, plannerState, rangeStart, selectedPlan]);
  const selectedDay = useMemo(() => {
    if (!selectedPlan || plannerState.status !== "ready" || !activeDate) {
      return undefined;
    }

    return resolveMealPlanCalendarDay(selectedPlan, plannerState.recipes, activeDate);
  }, [activeDate, plannerState, selectedPlan]);
  const setupDraft =
    setupDraftOverride ?? (selectedPlan ? setupDraftFromPlan(selectedPlan) : defaultSetupDraft());

  async function loadPlanner() {
    setPlannerState({ status: "loading" });
    const [plansResult, recipesResult] = await Promise.all([
      mealPlanUseCases.listPlans(),
      recipeUseCases.listRecipes(),
    ]);

    if (!plansResult.ok) {
      setPlannerState({ status: "error", message: plansResult.error.message });
      return;
    }

    if (!recipesResult.ok) {
      setPlannerState({ status: "error", message: recipesResult.error.message });
      return;
    }

    const firstPlanId = plansResult.value[0]?.id ?? "";
    setSelectedDate((current) => current || anchorDateForPlan(plansResult.value[0]));
    setPlannerState({
      status: "ready",
      plans: plansResult.value,
      recipes: recipesResult.value,
      selectedPlanId: firstPlanId,
    });
  }

  async function refreshPlanner(nextError?: string) {
    if (plannerState.status !== "ready") {
      return;
    }

    const [plansResult, recipesResult] = await Promise.all([
      mealPlanUseCases.listPlans(),
      recipeUseCases.listRecipes(),
    ]);

    if (!plansResult.ok) {
      setPlannerState({ status: "error", message: plansResult.error.message });
      return;
    }

    if (!recipesResult.ok) {
      setPlannerState({ status: "error", message: recipesResult.error.message });
      return;
    }

    setPlannerState({
      status: "ready",
      plans: plansResult.value,
      recipes: recipesResult.value,
      selectedPlanId:
        plansResult.value.find((plan) => plan.id === plannerState.selectedPlanId)?.id ??
        plansResult.value[0]?.id ??
        "",
      error: nextError,
    });
  }

  function showActionError(message: string) {
    if (plannerState.status === "ready") {
      setPlannerState({ ...plannerState, error: message });
    }
  }

  async function applySetup() {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.configureSchedule(selectedPlan.id, {
      mode: setupDraft.mode,
      startDate: setupDraft.startDate || undefined,
      dayLabels: labelsFromText(setupDraft.dayLabels),
      individualDates: labelsFromText(setupDraft.individualDates),
    });

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    setSetupDraftOverride(undefined);
    setSelectedDate(anchorDateForPlan(result.value));
    onChanged();
    await refreshPlanner();
  }

  async function saveTargets(dayId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.updateScheduleDayTargets(
      selectedPlan.id,
      dayId,
      targetsFromDraft(targetDrafts[dayId]),
    );

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    onChanged();
    await refreshPlanner();
  }

  async function addScheduleEntry(dayId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const draft = entryDrafts[dayId] ?? defaultEntryDraft();
    const result = await mealPlanUseCases.addScheduleEntry(selectedPlan.id, dayId, {
      id: `schedule-entry-${Date.now()}`,
      recipeId: draft.recipeId,
      servings: draft.servings,
      slotLabel: draft.slotLabel || undefined,
      context: draft.context,
    });

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    setEntryDrafts({ ...entryDrafts, [dayId]: defaultEntryDraft() });
    onChanged();
    await refreshPlanner();
  }

  async function updateScheduleEntryServings(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.changeScheduleEntryServings(
      selectedPlan.id,
      entryId,
      scheduleServingDrafts[entryId] ?? 1,
    );

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    onChanged();
    await refreshPlanner();
  }

  async function removeScheduleEntry(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.removeScheduleEntry(selectedPlan.id, entryId);

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    onChanged();
    await refreshPlanner();
  }

  async function setEntryEaten(entryId: string, eaten: boolean) {
    if (plannerState.status !== "ready" || !selectedPlan || !selectedDay) {
      return;
    }

    const result = await mealPlanUseCases.setDateEntryEaten(
      selectedPlan.id,
      selectedDay.date,
      entryId,
      eaten,
    );

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    onChanged();
    await refreshPlanner();
  }

  async function saveDateServings(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan || !selectedDay) {
      return;
    }

    const result = await mealPlanUseCases.setDateEntryServings(
      selectedPlan.id,
      selectedDay.date,
      entryId,
      dateServingDrafts[entryId] ?? 1,
    );

    if (!result.ok) {
      showActionError(result.error.message);
      return;
    }

    onChanged();
    await refreshPlanner();
  }

  if (plannerState.status === "loading") {
    return <LoadingView title="Loading planner" />;
  }

  if (plannerState.status === "error") {
    return (
      <ErrorView
        title="Planner unavailable"
        message={plannerState.message}
        action={{ label: "Try again", onClick: () => void loadPlanner() }}
      />
    );
  }

  if (plannerState.plans.length === 0 || !selectedPlan) {
    return (
      <EmptyView
        title="No meal plan yet"
        message="Create a local plan through the application layer before adding meals."
      />
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="planner-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Calendar planner</p>
          <h2 id="planner-title">Planner</h2>
        </div>
        <button className="primary-button" type="button" onClick={() => setSetupOpen(!setupOpen)}>
          Setup plan
        </button>
      </div>

      {plannerState.error ? (
        <ErrorView title="Planner action failed" message={plannerState.error} />
      ) : null}

      <label>
        <span>Plan</span>
        <select
          aria-label="Selected meal plan"
          value={plannerState.selectedPlanId}
          onChange={(event) => {
            const nextPlan = plannerState.plans.find((plan) => plan.id === event.target.value);
            setSelectedDate(anchorDateForPlan(nextPlan));
            setSetupDraftOverride(undefined);
            setPlannerState({
              ...plannerState,
              selectedPlanId: event.target.value,
              error: undefined,
            });
          }}
        >
          {plannerState.plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>

      {setupOpen ? (
        <PlannerSetup
          draft={setupDraft}
          entryDrafts={entryDrafts}
          onAddEntry={(dayId) => void addScheduleEntry(dayId)}
          onApply={applySetup}
          onChangeDraft={(draft) => setSetupDraftOverride(draft)}
          onChangeEntryDraft={(dayId, draft) => setEntryDrafts({ ...entryDrafts, [dayId]: draft })}
          onChangeScheduleServing={(entryId, servings) =>
            setScheduleServingDrafts({ ...scheduleServingDrafts, [entryId]: servings })
          }
          onChangeTargetDraft={(dayId, draft) =>
            setTargetDrafts({ ...targetDrafts, [dayId]: draft })
          }
          onRemoveEntry={(entryId) => void removeScheduleEntry(entryId)}
          onSaveTargets={(dayId) => void saveTargets(dayId)}
          onUpdateScheduleEntry={(entryId) => void updateScheduleEntryServings(entryId)}
          plan={selectedPlan}
          recipes={plannerState.recipes}
          scheduleServingDrafts={scheduleServingDrafts}
          targetDrafts={targetDrafts}
        />
      ) : null}

      <PlannerCalendar
        calendarDays={calendarDays}
        calendarView={calendarView}
        onChangeDate={setSelectedDate}
        onChangeView={setCalendarView}
        onMoveRange={(direction) =>
          setSelectedDate(
            addDaysToLocalDate(activeDate, direction * (calendarView === "week" ? 7 : 30)),
          )
        }
        selectedDate={activeDate}
      />

      {selectedDay ? (
        <PlannerDayDetail
          day={selectedDay}
          onChangeDateServing={(entryId, servings) =>
            setDateServingDrafts({ ...dateServingDrafts, [entryId]: servings })
          }
          onOpenRecipe={onOpenRecipe}
          onSaveDateServing={(entryId) => void saveDateServings(entryId)}
          onToggleEaten={(entryId, eaten) => void setEntryEaten(entryId, eaten)}
          recipes={plannerState.recipes}
          servingDrafts={dateServingDrafts}
        />
      ) : null}
    </section>
  );
}

function PlannerSetup({
  draft,
  entryDrafts,
  onAddEntry,
  onApply,
  onChangeDraft,
  onChangeEntryDraft,
  onChangeScheduleServing,
  onChangeTargetDraft,
  onRemoveEntry,
  onSaveTargets,
  onUpdateScheduleEntry,
  plan,
  recipes,
  scheduleServingDrafts,
  targetDrafts,
}: {
  draft: SetupDraft;
  entryDrafts: Record<string, EntryDraft>;
  onAddEntry: (dayId: string) => void;
  onApply: () => void;
  onChangeDraft: (draft: SetupDraft) => void;
  onChangeEntryDraft: (dayId: string, draft: EntryDraft) => void;
  onChangeScheduleServing: (entryId: string, servings: number) => void;
  onChangeTargetDraft: (dayId: string, draft: TargetDraft) => void;
  onRemoveEntry: (entryId: string) => void;
  onSaveTargets: (dayId: string) => void;
  onUpdateScheduleEntry: (entryId: string) => void;
  plan: MealPlan;
  recipes: ReadonlyArray<Recipe>;
  scheduleServingDrafts: Record<string, number>;
  targetDrafts: Record<string, TargetDraft>;
}) {
  const days = plan.schedule?.days ?? [];

  return (
    <section className="planner-setup" aria-labelledby="planner-setup-title">
      <div className="screen-header screen-header--compact">
        <div>
          <p className="section-kicker">Setup</p>
          <h3 id="planner-setup-title">Plan setup</h3>
        </div>
        <button className="primary-button" type="button" onClick={onApply}>
          Apply setup
        </button>
      </div>

      <div className="planner-setup-grid">
        <label>
          <span>Plan type</span>
          <select
            aria-label="Planner setup mode"
            value={draft.mode}
            onChange={(event) =>
              onChangeDraft({ ...draft, mode: event.target.value as MealPlanScheduleMode })
            }
          >
            <option value="weekly">Weekly Mon-Sun</option>
            <option value="customLoop">Custom loop</option>
            <option value="individualDates">Individual dates</option>
          </select>
        </label>
        {draft.mode !== "individualDates" ? (
          <label>
            <span>Start date</span>
            <input
              aria-label="Planner setup start date"
              type="date"
              value={draft.startDate}
              onChange={(event) => onChangeDraft({ ...draft, startDate: event.target.value })}
            />
          </label>
        ) : null}
        {draft.mode === "customLoop" ? (
          <label className="full-span">
            <span>Custom loop days</span>
            <input
              aria-label="Custom loop day labels"
              value={draft.dayLabels}
              onChange={(event) => onChangeDraft({ ...draft, dayLabels: event.target.value })}
            />
          </label>
        ) : null}
        {draft.mode === "individualDates" ? (
          <label className="full-span">
            <span>Individual dates</span>
            <input
              aria-label="Individual planner dates"
              value={draft.individualDates}
              onChange={(event) => onChangeDraft({ ...draft, individualDates: event.target.value })}
            />
          </label>
        ) : null}
      </div>

      <div className="planner-days">
        {days.map((day) => (
          <ScheduleSetupDay
            day={day}
            draft={entryDrafts[day.id] ?? defaultEntryDraft()}
            key={day.id}
            onAddEntry={onAddEntry}
            onChangeDraft={onChangeEntryDraft}
            onChangeServing={onChangeScheduleServing}
            onChangeTargetDraft={onChangeTargetDraft}
            onRemoveEntry={onRemoveEntry}
            onSaveTargets={onSaveTargets}
            onUpdateEntry={onUpdateScheduleEntry}
            recipes={recipes}
            servingDrafts={scheduleServingDrafts}
            targetDraft={targetDrafts[day.id] ?? targetDraftFromTargets(day.targets)}
          />
        ))}
      </div>
    </section>
  );
}

function ScheduleSetupDay({
  day,
  draft,
  onAddEntry,
  onChangeDraft,
  onChangeServing,
  onChangeTargetDraft,
  onRemoveEntry,
  onSaveTargets,
  onUpdateEntry,
  recipes,
  servingDrafts,
  targetDraft,
}: {
  day: MealPlanDayDefinition;
  draft: EntryDraft;
  onAddEntry: (dayId: string) => void;
  onChangeDraft: (dayId: string, draft: EntryDraft) => void;
  onChangeServing: (entryId: string, servings: number) => void;
  onChangeTargetDraft: (dayId: string, draft: TargetDraft) => void;
  onRemoveEntry: (entryId: string) => void;
  onSaveTargets: (dayId: string) => void;
  onUpdateEntry: (entryId: string) => void;
  recipes: ReadonlyArray<Recipe>;
  servingDrafts: Record<string, number>;
  targetDraft: TargetDraft;
}) {
  return (
    <section className="planner-day" aria-labelledby={`${day.id}-setup-title`}>
      <div className="screen-header screen-header--compact">
        <h4 id={`${day.id}-setup-title`}>{day.label}</h4>
      </div>

      <div className="planner-target-grid" role="group" aria-label={`${day.label} daily targets`}>
        {nutritionMetrics.map((item) => (
          <label key={item.metric}>
            <span>{item.label} target</span>
            <input
              aria-label={`${day.label} ${item.label} target`}
              min="0"
              type="number"
              value={targetDraft[item.metric]}
              onChange={(event) =>
                onChangeTargetDraft(day.id, {
                  ...targetDraft,
                  [item.metric]: event.target.value,
                })
              }
            />
          </label>
        ))}
        <button className="secondary-button" type="button" onClick={() => onSaveTargets(day.id)}>
          Save targets
        </button>
      </div>

      {day.entries.length > 0 ? (
        <ul className="compact-list planner-entry-list" aria-label={`${day.label} setup meals`}>
          {day.entries.map((entry) => {
            const title = recipeTitle(recipes, entry.recipeId);
            return (
              <li key={entry.id}>
                <span className="recipe-card__main">
                  <span>{title}</span>
                  <span className="muted-text">{entryMeta(entry.slotLabel, entry.context)}</span>
                </span>
                <label className="inline-field">
                  <span>Servings</span>
                  <input
                    aria-label={`Setup servings for ${title}`}
                    min="1"
                    type="number"
                    value={servingDrafts[entry.id] ?? entry.servings}
                    onChange={(event) => onChangeServing(entry.id, Number(event.target.value))}
                  />
                </label>
                <div className="planner-entry-actions">
                  <button
                    aria-label={`Update ${title} setup entry`}
                    className="text-button"
                    type="button"
                    onClick={() => onUpdateEntry(entry.id)}
                  >
                    Update
                  </button>
                  <button
                    aria-label={`Remove ${title} setup entry`}
                    className="text-button"
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyView title="No meals planned" message="Add a saved recipe to this day." />
      )}

      <div className="planner-day__add">
        <label>
          <span>Recipe</span>
          <select
            aria-label={`Setup recipe for ${day.label}`}
            value={draft.recipeId}
            onChange={(event) => onChangeDraft(day.id, { ...draft, recipeId: event.target.value })}
          >
            <option value="">Choose recipe</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Servings</span>
          <input
            aria-label={`Setup new servings for ${day.label}`}
            min="1"
            type="number"
            value={draft.servings}
            onChange={(event) =>
              onChangeDraft(day.id, { ...draft, servings: Number(event.target.value) })
            }
          />
        </label>
        <label>
          <span>Meal label</span>
          <input
            aria-label={`Setup meal label for ${day.label}`}
            value={draft.slotLabel}
            onChange={(event) => onChangeDraft(day.id, { ...draft, slotLabel: event.target.value })}
          />
        </label>
        <label>
          <span>Context</span>
          <select
            aria-label={`Setup context for ${day.label}`}
            value={draft.context}
            onChange={(event) =>
              onChangeDraft(day.id, {
                ...draft,
                context: event.target.value as PlannedMealEntryContext,
              })
            }
          >
            <option value="eat">Eat</option>
            <option value="cook">Cook</option>
            <option value="prep">Prep</option>
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={!draft.recipeId}
          type="button"
          onClick={() => onAddEntry(day.id)}
        >
          Add meal
        </button>
      </div>
    </section>
  );
}

function PlannerCalendar({
  calendarDays,
  calendarView,
  onChangeDate,
  onChangeView,
  onMoveRange,
  selectedDate,
}: {
  calendarDays: ReadonlyArray<MealPlanCalendarDaySummary>;
  calendarView: CalendarView;
  onChangeDate: (date: string) => void;
  onChangeView: (view: CalendarView) => void;
  onMoveRange: (direction: -1 | 1) => void;
  selectedDate: string;
}) {
  return (
    <section className="planner-calendar" aria-labelledby="planner-calendar-title">
      <div className="screen-header screen-header--compact">
        <div>
          <p className="section-kicker">{calendarView}</p>
          <h3 id="planner-calendar-title">Calendar</h3>
        </div>
        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => onMoveRange(-1)}>
            Previous
          </button>
          <button className="secondary-button" type="button" onClick={() => onMoveRange(1)}>
            Next
          </button>
        </div>
      </div>

      <div className="segmented-control" role="tablist" aria-label="Calendar view">
        <button
          aria-selected={calendarView === "week"}
          className="secondary-button"
          role="tab"
          type="button"
          onClick={() => onChangeView("week")}
        >
          Week
        </button>
        <button
          aria-selected={calendarView === "month"}
          className="secondary-button"
          role="tab"
          type="button"
          onClick={() => onChangeView("month")}
        >
          Month
        </button>
      </div>

      <div className="planner-calendar-grid" aria-label={`${calendarView} planner days`}>
        {calendarDays.map((day) => (
          <button
            aria-label={`Open ${day.date}`}
            className={`planner-calendar-day${
              day.date === selectedDate ? " planner-calendar-day--selected" : ""
            }`}
            key={day.date}
            type="button"
            onClick={() => onChangeDate(day.date)}
          >
            <span>{day.date}</span>
            <strong>{day.label}</strong>
            <span className="muted-text">
              {day.entries.length} meals · Planned {metricText(day.plannedTotals)}
            </span>
            <span className="muted-text">Eaten {metricText(day.eatenTotals)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PlannerDayDetail({
  day,
  onChangeDateServing,
  onOpenRecipe,
  onSaveDateServing,
  onToggleEaten,
  recipes,
  servingDrafts,
}: {
  day: MealPlanCalendarDaySummary;
  onChangeDateServing: (entryId: string, servings: number) => void;
  onOpenRecipe?: (recipeId: string, servings: number, openCookMode: boolean) => void;
  onSaveDateServing: (entryId: string) => void;
  onToggleEaten: (entryId: string, eaten: boolean) => void;
  recipes: ReadonlyArray<Recipe>;
  servingDrafts: Record<string, number>;
}) {
  return (
    <section className="planner-day-detail" aria-labelledby="planner-day-detail-title">
      <div className="screen-header screen-header--compact">
        <div>
          <p className="section-kicker">{day.date}</p>
          <h3 id="planner-day-detail-title">{day.label}</h3>
        </div>
      </div>

      <div className="planner-summary-grid" aria-label={`${day.label} macro summary`}>
        <NutritionSummary label="Target" values={day.targets} />
        <NutritionSummary label="Planned" values={day.plannedTotals} />
        <NutritionSummary label="Eaten" values={day.eatenTotals} />
        <NutritionSummary label="Left to target" values={day.leftToTarget} />
        <NutritionSummary label="Planned left" values={day.plannedLeft} />
      </div>

      {day.entries.length > 0 ? (
        <div className="planner-meal-list" aria-label={`${day.label} meals`}>
          {day.entries.map((entry) => {
            const recipe = recipes.find((candidate) => candidate.id === entry.recipeId);
            const title = recipe?.title ?? entry.title ?? "Missing recipe";
            return (
              <details className="planner-meal-details" key={entry.id}>
                <summary>
                  <span>
                    <strong>{title}</strong>
                    <span className="muted-text">
                      {" "}
                      · {formatNutritionAmount(entry.effectiveServings)} servings ·{" "}
                      {metricText(entry.nutrition)}
                    </span>
                  </span>
                  <label className="checkbox-row">
                    <input
                      aria-label={`Mark ${title} eaten on ${day.date}`}
                      checked={entry.eaten}
                      type="checkbox"
                      onChange={(event) => onToggleEaten(entry.id, event.target.checked)}
                    />
                    Eaten
                  </label>
                </summary>
                <div className="planner-meal-details__body">
                  {recipe ? <p>{recipe.description}</p> : null}
                  <label className="inline-field">
                    <span>Servings for this date</span>
                    <input
                      aria-label={`Date servings for ${title}`}
                      min="1"
                      type="number"
                      value={servingDrafts[entry.id] ?? entry.effectiveServings}
                      onChange={(event) =>
                        onChangeDateServing(entry.id, Number(event.target.value))
                      }
                    />
                  </label>
                  <div className="action-row">
                    <button
                      aria-label={`Save ${title} date servings`}
                      className="secondary-button"
                      type="button"
                      onClick={() => onSaveDateServing(entry.id)}
                    >
                      Save servings
                    </button>
                    {onOpenRecipe ? (
                      <button
                        aria-label={`Cook ${title}`}
                        className="primary-button"
                        type="button"
                        onClick={() => onOpenRecipe(entry.recipeId, entry.effectiveServings, true)}
                      >
                        Cook recipe
                      </button>
                    ) : null}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <EmptyView title="No meals for this date" message="Use Setup plan to add meals." />
      )}
    </section>
  );
}

function NutritionSummary({ label, values }: { label: string; values: PlannerNutritionTargets }) {
  return (
    <section className="planner-summary-item" aria-label={label}>
      <strong>{label}</strong>
      <span>{metricText(values)}</span>
    </section>
  );
}

function setupDraftFromPlan(plan: MealPlan): SetupDraft {
  const schedule = plan.schedule;

  if (!schedule) {
    return defaultSetupDraft();
  }

  if (schedule.mode === "individualDates") {
    return {
      mode: "individualDates",
      startDate: anchorDateForPlan(plan),
      dayLabels: "",
      individualDates: schedule.days.map((day) => day.date).join(", "),
    };
  }

  return {
    mode: schedule.mode,
    startDate: schedule.startDate ?? anchorDateForPlan(plan),
    dayLabels: schedule.days.map((day) => day.label).join(", "),
    individualDates: "",
  };
}

function defaultSetupDraft(): SetupDraft {
  return {
    mode: "customLoop",
    startDate: "2026-05-22",
    dayLabels: "Training Day, Non-training Day",
    individualDates: "2026-05-22",
  };
}

function defaultEntryDraft(): EntryDraft {
  return {
    recipeId: "",
    servings: 1,
    slotLabel: "",
    context: "eat",
  };
}

function targetDraftFromTargets(targets: PlannerNutritionTargets | undefined): TargetDraft {
  return {
    calories: valueToDraft(targets?.calories),
    protein: valueToDraft(targets?.protein),
    fat: valueToDraft(targets?.fat),
    carbs: valueToDraft(targets?.carbs),
  };
}

function targetsFromDraft(draft: TargetDraft | undefined): PlannerNutritionTargets {
  if (!draft) {
    return {};
  }

  return nutritionMetrics.reduce<PlannerNutritionTargets>((targets, item) => {
    const value = Number(draft[item.metric]);

    if (draft[item.metric].trim().length > 0 && Number.isFinite(value)) {
      targets[item.metric] = value;
    }

    return targets;
  }, {});
}

function labelsFromText(value: string) {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

function valueToDraft(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

function recipeTitle(recipes: ReadonlyArray<Recipe>, recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId)?.title ?? "Missing recipe";
}

function entryMeta(slotLabel: string | undefined, context: PlannedMealEntryContext | undefined) {
  return [slotLabel, context].filter(Boolean).join(" · ") || "Meal";
}

function metricText(values: PlannerNutritionTargets) {
  const parts = nutritionMetrics.flatMap((item) => {
    const value = values[item.metric];
    return value === undefined
      ? []
      : [`${item.label} ${formatNutritionAmount(value)} ${item.unit}`];
  });

  return parts.length > 0 ? parts.join(" · ") : "No macro data";
}

function anchorDateForPlan(plan: MealPlan | undefined) {
  if (!plan) {
    return "2026-05-22";
  }

  if (plan.schedule?.mode === "customLoop" || plan.schedule?.mode === "weekly") {
    return plan.schedule.startDate ?? dateFromIso(plan.createdAt);
  }

  if (plan.schedule?.mode === "individualDates") {
    return plan.schedule.days[0]?.date ?? dateFromIso(plan.createdAt);
  }

  if (plan.board?.startDate) {
    return plan.board.startDate;
  }

  return dateFromIso(plan.createdAt);
}

function dateFromIso(value: string) {
  const candidate = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "2026-05-22";
}

function calendarRangeStart(date: string, view: CalendarView) {
  if (view === "month") {
    return `${date.slice(0, 8)}01`;
  }

  return addDaysToLocalDate(date, -localWeekdayIndex(date));
}

function daysInMonth(date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function localWeekdayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utcDay === 0 ? 6 : utcDay - 1;
}

function addDaysToLocalDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
