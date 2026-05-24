import { useEffect, useMemo, useState } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { RecipeUseCases } from "../../recipes/application/recipeUseCases";
import { formatNutritionAmount, getPlannedNutritionSummary } from "../../recipes/domain/nutrition";
import type { Recipe } from "../../recipes/domain/recipe";
import type { MealPlanUseCases } from "../application/mealPlanUseCases";
import {
  DEFAULT_PLANNER_SLOT_TEMPLATES,
  type MealPlan,
  type PlannedMealEntryContext,
  type PlannerBoard,
  type PlannerBoardEntry,
  type PlannerBoardPreset,
  type PlannerDayBucket,
  type PlannerSlotTemplate,
} from "../domain/mealPlan";

type PlannerScreenProps = {
  mealPlanUseCases: MealPlanUseCases;
  recipeUseCases: RecipeUseCases;
  onChanged: () => void;
};

type PlannerMode = "board" | "templates";

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

type BoardConfigurationDraft = {
  preset: PlannerBoardPreset;
  startDate: string;
  slotLabels: string;
  customDayLabels: string;
};

type BoardEntryDraft = {
  recipeId: string;
  servings: number;
  slotId: string;
  customSlotLabel: string;
  context: PlannedMealEntryContext;
};

type BoardMoveDraft = {
  targetDayId: string;
  targetSlotId: string;
  targetCustomSlotLabel: string;
};

const noSlotValue = "__no-slot";
const customSlotValue = "__custom-slot";

export function PlannerScreen({ mealPlanUseCases, recipeUseCases, onChanged }: PlannerScreenProps) {
  const [plannerState, setPlannerState] = useState<PlannerState>({ status: "loading" });
  const [mode, setMode] = useState<PlannerMode>("board");
  const [dayLabel, setDayLabel] = useState("");
  const [boardDraftOverride, setBoardDraftOverride] = useState<
    { key: string; draft: BoardConfigurationDraft } | undefined
  >();
  const [boardEntryDrafts, setBoardEntryDrafts] = useState<Record<string, BoardEntryDraft>>({});
  const [boardServingDrafts, setBoardServingDrafts] = useState<Record<string, number>>({});
  const [boardMoveDrafts, setBoardMoveDrafts] = useState<Record<string, BoardMoveDraft>>({});
  const [templateEntryDrafts, setTemplateEntryDrafts] = useState<
    Record<string, { recipeId: string; servings: number }>
  >({});
  const [templateServingDrafts, setTemplateServingDrafts] = useState<Record<string, number>>({});
  const [templateMoveDrafts, setTemplateMoveDrafts] = useState<Record<string, string>>({});

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

  const selectedBoard = selectedPlan?.board;
  const boardDraftKey = selectedPlan ? boardConfigurationDraftKey(selectedPlan) : "planner-empty";
  const boardDraft = useMemo(() => {
    if (boardDraftOverride?.key === boardDraftKey) {
      return boardDraftOverride.draft;
    }

    return selectedBoard
      ? boardConfigurationDraftFromBoard(selectedBoard)
      : defaultBoardConfigurationDraft();
  }, [boardDraftKey, boardDraftOverride, selectedBoard]);

  function setBoardDraft(draft: BoardConfigurationDraft) {
    setBoardDraftOverride({ key: boardDraftKey, draft });
  }

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

    setPlannerState({
      status: "ready",
      plans: plansResult.value,
      recipes: recipesResult.value,
      selectedPlanId: plansResult.value[0]?.id ?? "",
    });
  }

  async function configureBoard() {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.configureBoard(selectedPlan.id, {
      preset: boardDraft.preset,
      startDate: boardDraft.startDate || undefined,
      customDayLabels: labelsFromText(boardDraft.customDayLabels),
      slotTemplates: slotTemplatesFromText(boardDraft.slotLabels),
    });

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function addBoardEntry(dayId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const draft = boardEntryDrafts[dayId] ?? defaultBoardEntryDraft();
    const result = await mealPlanUseCases.addBoardEntry(selectedPlan.id, dayId, {
      id: `board-entry-${Date.now()}`,
      recipeId: draft.recipeId,
      servings: draft.servings,
      context: draft.context,
      ...slotPayload(draft.slotId, draft.customSlotLabel),
    });

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    setBoardEntryDrafts({ ...boardEntryDrafts, [dayId]: defaultBoardEntryDraft() });
    onChanged();
    await loadPlanner();
  }

  async function changeBoardServings(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.changeBoardEntryServings(
      selectedPlan.id,
      entryId,
      boardServingDrafts[entryId] ?? 1,
    );

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function moveBoardEntry(entry: PlannerBoardEntry) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const draft = boardMoveDrafts[entry.id];
    const result = await mealPlanUseCases.moveBoardEntry(selectedPlan.id, entry.id, {
      targetDayId: draft?.targetDayId || selectedPlan.board?.days[0]?.id || "",
      targetSlotId:
        draft?.targetSlotId === customSlotValue
          ? undefined
          : slotIdOrUndefined(draft?.targetSlotId),
      targetCustomSlotLabel:
        draft?.targetSlotId === customSlotValue ? draft.targetCustomSlotLabel : undefined,
    });

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function removeBoardEntry(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.removeBoardEntry(selectedPlan.id, entryId);

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function addDay() {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.addDay(selectedPlan.id, {
      id: `day-${Date.now()}`,
      label: dayLabel,
      preset: "custom",
    });

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    setDayLabel("");
    onChanged();
    await loadPlanner();
  }

  async function addRecipeToTemplateDay(dayId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const draft = templateEntryDrafts[dayId] ?? { recipeId: "", servings: 1 };
    const result = await mealPlanUseCases.addSavedRecipeToDay(selectedPlan.id, dayId, {
      id: `entry-${Date.now()}`,
      recipeId: draft.recipeId,
      servings: draft.servings,
    });

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    setTemplateEntryDrafts({ ...templateEntryDrafts, [dayId]: { recipeId: "", servings: 1 } });
    onChanged();
    await loadPlanner();
  }

  async function changeTemplateServings(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.changeServings(
      selectedPlan.id,
      entryId,
      templateServingDrafts[entryId] ?? 1,
    );

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function moveTemplateEntry(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.moveEntry(
      selectedPlan.id,
      entryId,
      templateMoveDrafts[entryId] || selectedPlan.loopDays[0]?.id || "",
    );

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
  }

  async function removeTemplateEntry(entryId: string) {
    if (plannerState.status !== "ready" || !selectedPlan) {
      return;
    }

    const result = await mealPlanUseCases.removeEntry(selectedPlan.id, entryId);

    if (!result.ok) {
      setPlannerState({ ...plannerState, error: result.error.message });
      return;
    }

    onChanged();
    await loadPlanner();
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
        message="Create a loop plan through the application layer before adding meals."
      />
    );
  }

  return (
    <section className="screen-stack" aria-labelledby="planner-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Flexible board</p>
          <h2 id="planner-title">Planner</h2>
        </div>
      </div>

      {plannerState.error ? (
        <ErrorView title="Planner action failed" message={plannerState.error} />
      ) : null}

      <label>
        <span>Plan</span>
        <select
          aria-label="Selected meal plan"
          value={plannerState.selectedPlanId}
          onChange={(event) =>
            setPlannerState({
              ...plannerState,
              selectedPlanId: event.target.value,
              error: undefined,
            })
          }
        >
          {plannerState.plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>

      <div className="planner-mode-tabs" role="tablist" aria-label="Planner mode">
        <button
          aria-selected={mode === "board"}
          className="secondary-button"
          role="tab"
          type="button"
          onClick={() => setMode("board")}
        >
          Board
        </button>
        <button
          aria-selected={mode === "templates"}
          className="secondary-button"
          role="tab"
          type="button"
          onClick={() => setMode("templates")}
        >
          Templates
        </button>
      </div>

      {mode === "board" ? (
        <BoardPlanner
          board={selectedPlan.board}
          boardDraft={boardDraft}
          boardEntryDrafts={boardEntryDrafts}
          boardMoveDrafts={boardMoveDrafts}
          boardServingDrafts={boardServingDrafts}
          onAddEntry={(dayId) => void addBoardEntry(dayId)}
          onChangeBoardDraft={setBoardDraft}
          onChangeEntryDraft={(dayId, draft) =>
            setBoardEntryDrafts({ ...boardEntryDrafts, [dayId]: draft })
          }
          onChangeMoveDraft={(entryId, draft) =>
            setBoardMoveDrafts({ ...boardMoveDrafts, [entryId]: draft })
          }
          onChangeServingDraft={(entryId, servings) =>
            setBoardServingDrafts({ ...boardServingDrafts, [entryId]: servings })
          }
          onConfigure={() => void configureBoard()}
          onMoveEntry={(entry) => void moveBoardEntry(entry)}
          onRemoveEntry={(entryId) => void removeBoardEntry(entryId)}
          onUpdateServings={(entryId) => void changeBoardServings(entryId)}
          recipes={plannerState.recipes}
        />
      ) : (
        <TemplatePlanner
          dayLabel={dayLabel}
          onAddDay={() => void addDay()}
          onAddRecipe={(dayId) => void addRecipeToTemplateDay(dayId)}
          onChangeDayLabel={setDayLabel}
          onChangeEntryDraft={(dayId, draft) =>
            setTemplateEntryDrafts({ ...templateEntryDrafts, [dayId]: draft })
          }
          onChangeMoveDraft={(entryId, dayId) =>
            setTemplateMoveDrafts({ ...templateMoveDrafts, [entryId]: dayId })
          }
          onChangeServingDraft={(entryId, servings) =>
            setTemplateServingDrafts({ ...templateServingDrafts, [entryId]: servings })
          }
          onMoveEntry={(entryId) => void moveTemplateEntry(entryId)}
          onRemoveEntry={(entryId) => void removeTemplateEntry(entryId)}
          onUpdateServings={(entryId) => void changeTemplateServings(entryId)}
          plan={selectedPlan}
          recipes={plannerState.recipes}
          templateEntryDrafts={templateEntryDrafts}
          templateMoveDrafts={templateMoveDrafts}
          templateServingDrafts={templateServingDrafts}
        />
      )}
    </section>
  );
}

function BoardPlanner({
  board,
  boardDraft,
  boardEntryDrafts,
  boardMoveDrafts,
  boardServingDrafts,
  onAddEntry,
  onChangeBoardDraft,
  onChangeEntryDraft,
  onChangeMoveDraft,
  onChangeServingDraft,
  onConfigure,
  onMoveEntry,
  onRemoveEntry,
  onUpdateServings,
  recipes,
}: {
  board: PlannerBoard | undefined;
  boardDraft: BoardConfigurationDraft;
  boardEntryDrafts: Record<string, BoardEntryDraft>;
  boardMoveDrafts: Record<string, BoardMoveDraft>;
  boardServingDrafts: Record<string, number>;
  onAddEntry: (dayId: string) => void;
  onChangeBoardDraft: (draft: BoardConfigurationDraft) => void;
  onChangeEntryDraft: (dayId: string, draft: BoardEntryDraft) => void;
  onChangeMoveDraft: (entryId: string, draft: BoardMoveDraft) => void;
  onChangeServingDraft: (entryId: string, servings: number) => void;
  onConfigure: () => void;
  onMoveEntry: (entry: PlannerBoardEntry) => void;
  onRemoveEntry: (entryId: string) => void;
  onUpdateServings: (entryId: string) => void;
  recipes: ReadonlyArray<Recipe>;
}) {
  if (!board) {
    return <EmptyView title="No board yet" message="Configure a planner board to add meals." />;
  }

  return (
    <div className="screen-stack" role="tabpanel" aria-label="Planner board">
      <div className="planner-board-config">
        <label>
          <span>Preset</span>
          <select
            aria-label="Planner board preset"
            value={boardDraft.preset}
            onChange={(event) =>
              onChangeBoardDraft({
                ...boardDraft,
                preset: event.target.value as PlannerBoardPreset,
              })
            }
          >
            <option value="weekly">Weekly</option>
            <option value="rolling7">Rolling 7</option>
            <option value="month">Month list</option>
            <option value="customLoop">Custom loop</option>
          </select>
        </label>
        <label>
          <span>Start date</span>
          <input
            aria-label="Board start date"
            type="date"
            value={boardDraft.startDate}
            onChange={(event) =>
              onChangeBoardDraft({ ...boardDraft, startDate: event.target.value })
            }
          />
        </label>
        <label>
          <span>Slots</span>
          <input
            aria-label="Board slot templates"
            value={boardDraft.slotLabels}
            onChange={(event) =>
              onChangeBoardDraft({ ...boardDraft, slotLabels: event.target.value })
            }
          />
        </label>
        <label>
          <span>Days</span>
          <input
            aria-label="Board custom day labels"
            value={boardDraft.customDayLabels}
            onChange={(event) =>
              onChangeBoardDraft({ ...boardDraft, customDayLabels: event.target.value })
            }
          />
        </label>
        <button className="primary-button" type="button" onClick={onConfigure}>
          Apply board
        </button>
      </div>

      <div className="planner-days">
        {board.days.map((day) => (
          <BoardDay
            board={board}
            day={day}
            draft={boardEntryDrafts[day.id] ?? defaultBoardEntryDraft()}
            key={day.id}
            moveDrafts={boardMoveDrafts}
            onAddEntry={onAddEntry}
            onChangeDraft={onChangeEntryDraft}
            onChangeMoveDraft={onChangeMoveDraft}
            onChangeServingDraft={onChangeServingDraft}
            onMoveEntry={onMoveEntry}
            onRemoveEntry={onRemoveEntry}
            onUpdateServings={onUpdateServings}
            recipes={recipes}
            servingDrafts={boardServingDrafts}
          />
        ))}
      </div>
    </div>
  );
}

function BoardDay({
  board,
  day,
  draft,
  moveDrafts,
  onAddEntry,
  onChangeDraft,
  onChangeMoveDraft,
  onChangeServingDraft,
  onMoveEntry,
  onRemoveEntry,
  onUpdateServings,
  recipes,
  servingDrafts,
}: {
  board: PlannerBoard;
  day: PlannerDayBucket;
  draft: BoardEntryDraft;
  moveDrafts: Record<string, BoardMoveDraft>;
  onAddEntry: (dayId: string) => void;
  onChangeDraft: (dayId: string, draft: BoardEntryDraft) => void;
  onChangeMoveDraft: (entryId: string, draft: BoardMoveDraft) => void;
  onChangeServingDraft: (entryId: string, servings: number) => void;
  onMoveEntry: (entry: PlannerBoardEntry) => void;
  onRemoveEntry: (entryId: string) => void;
  onUpdateServings: (entryId: string) => void;
  recipes: ReadonlyArray<Recipe>;
  servingDrafts: Record<string, number>;
}) {
  return (
    <section className="planner-day" aria-labelledby={`${day.id}-board-title`}>
      <div className="screen-header screen-header--compact">
        <h3 id={`${day.id}-board-title`}>{day.label}</h3>
        {day.date ? <span className="pill">{day.date}</span> : null}
      </div>

      {day.entries.length > 0 ? (
        <ul className="compact-list planner-entry-list" aria-label={`${day.label} board meals`}>
          {day.entries.map((entry) => {
            const recipe = recipeById(recipes, entry.recipeId);
            const title = recipeTitle(recipes, entry.recipeId);
            const nutritionText = recipe ? plannedNutritionText(recipe, entry.servings) : "";
            const moveDraft = moveDrafts[entry.id] ?? {
              targetDayId: day.id,
              targetSlotId: entry.slotId ?? noSlotValue,
              targetCustomSlotLabel: entry.customSlotLabel ?? "",
            };

            return (
              <li key={entry.id}>
                <span className="recipe-card__main">
                  <span>{title}</span>
                  <span className="muted-text">
                    {boardEntryMeta(board, entry)}
                    {nutritionText ? ` · Nutrition: ${nutritionText}` : ""}
                  </span>
                </span>
                <label className="inline-field">
                  <span>Servings</span>
                  <input
                    aria-label={`Board servings for ${title}`}
                    min="1"
                    type="number"
                    value={servingDrafts[entry.id] ?? entry.servings}
                    onChange={(event) => onChangeServingDraft(entry.id, Number(event.target.value))}
                  />
                </label>
                <div className="planner-entry-actions">
                  <button
                    aria-label={`Update ${title} board entry`}
                    className="text-button"
                    type="button"
                    onClick={() => onUpdateServings(entry.id)}
                  >
                    Update board entry
                  </button>
                  <label>
                    <span>Day</span>
                    <select
                      aria-label={`Move ${title} to day`}
                      value={moveDraft.targetDayId}
                      onChange={(event) =>
                        onChangeMoveDraft(entry.id, {
                          ...moveDraft,
                          targetDayId: event.target.value,
                        })
                      }
                    >
                      {board.days.map((targetDay) => (
                        <option key={targetDay.id} value={targetDay.id}>
                          {targetDay.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <BoardSlotSelect
                    ariaLabel={`Move ${title} to slot`}
                    board={board}
                    customSlotLabel={moveDraft.targetCustomSlotLabel}
                    onChange={(slotId, customSlotLabel) =>
                      onChangeMoveDraft(entry.id, {
                        ...moveDraft,
                        targetSlotId: slotId,
                        targetCustomSlotLabel: customSlotLabel,
                      })
                    }
                    value={moveDraft.targetSlotId}
                  />
                  <button
                    aria-label={`Move ${title} board entry`}
                    className="text-button"
                    type="button"
                    onClick={() => onMoveEntry(entry)}
                  >
                    Move board entry
                  </button>
                  <button
                    aria-label={`Remove ${title} board entry`}
                    className="text-button"
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                  >
                    Remove board entry
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyView title="No meals planned" message="Add a saved recipe to this board day." />
      )}

      <div className="planner-day__add">
        <label>
          <span>Recipe</span>
          <select
            aria-label={`Board recipe for ${day.label}`}
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
            aria-label={`Board servings for ${day.label}`}
            min="1"
            type="number"
            value={draft.servings}
            onChange={(event) =>
              onChangeDraft(day.id, { ...draft, servings: Number(event.target.value) })
            }
          />
        </label>
        <BoardSlotSelect
          ariaLabel={`Board slot for ${day.label}`}
          board={board}
          customSlotLabel={draft.customSlotLabel}
          onChange={(slotId, customSlotLabel) =>
            onChangeDraft(day.id, { ...draft, slotId, customSlotLabel })
          }
          value={draft.slotId}
        />
        <label>
          <span>Context</span>
          <select
            aria-label={`Board context for ${day.label}`}
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
        <button className="secondary-button" type="button" onClick={() => onAddEntry(day.id)}>
          Add to board
        </button>
      </div>
    </section>
  );
}

function BoardSlotSelect({
  ariaLabel,
  board,
  customSlotLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  board: PlannerBoard;
  customSlotLabel: string;
  onChange: (slotId: string, customSlotLabel: string) => void;
  value: string;
}) {
  return (
    <>
      <label>
        <span>Slot</span>
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value, customSlotLabel)}
        >
          <option value={noSlotValue}>No slot</option>
          {board.slotTemplates.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.label}
            </option>
          ))}
          <option value={customSlotValue}>Custom slot</option>
        </select>
      </label>
      {value === customSlotValue ? (
        <label>
          <span>Custom slot</span>
          <input
            aria-label={ariaLabel.replace("slot", "custom slot")}
            value={customSlotLabel}
            onChange={(event) => onChange(value, event.target.value)}
          />
        </label>
      ) : null}
    </>
  );
}

function TemplatePlanner({
  dayLabel,
  onAddDay,
  onAddRecipe,
  onChangeDayLabel,
  onChangeEntryDraft,
  onChangeMoveDraft,
  onChangeServingDraft,
  onMoveEntry,
  onRemoveEntry,
  onUpdateServings,
  plan,
  recipes,
  templateEntryDrafts,
  templateMoveDrafts,
  templateServingDrafts,
}: {
  dayLabel: string;
  onAddDay: () => void;
  onAddRecipe: (dayId: string) => void;
  onChangeDayLabel: (label: string) => void;
  onChangeEntryDraft: (dayId: string, draft: { recipeId: string; servings: number }) => void;
  onChangeMoveDraft: (entryId: string, dayId: string) => void;
  onChangeServingDraft: (entryId: string, servings: number) => void;
  onMoveEntry: (entryId: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onUpdateServings: (entryId: string) => void;
  plan: MealPlan;
  recipes: ReadonlyArray<Recipe>;
  templateEntryDrafts: Record<string, { recipeId: string; servings: number }>;
  templateMoveDrafts: Record<string, string>;
  templateServingDrafts: Record<string, number>;
}) {
  return (
    <div className="screen-stack" role="tabpanel" aria-label="Planner templates">
      <div className="form-grid">
        <label>
          <span>New day</span>
          <input
            aria-label="New loop day label"
            value={dayLabel}
            onChange={(event) => onChangeDayLabel(event.target.value)}
          />
        </label>
        <button className="primary-button" type="button" onClick={onAddDay}>
          Add day
        </button>
      </div>

      <div className="planner-days">
        {plan.loopDays.map((day) => {
          const draft = templateEntryDrafts[day.id] ?? { recipeId: "", servings: 1 };

          return (
            <section className="planner-day" aria-labelledby={`${day.id}-title`} key={day.id}>
              <div className="screen-header screen-header--compact">
                <h3 id={`${day.id}-title`}>{day.label}</h3>
                <span className="pill">{day.preset}</span>
              </div>

              {day.entries.length > 0 ? (
                <ul className="compact-list" aria-label={`${day.label} meals`}>
                  {day.entries.map((entry) => {
                    const recipe = recipeById(recipes, entry.recipeId);
                    const title = recipeTitle(recipes, entry.recipeId);
                    const nutritionText = recipe
                      ? plannedNutritionText(recipe, entry.servings)
                      : "";

                    return (
                      <li key={entry.id}>
                        <span className="recipe-card__main">
                          <span>{title}</span>
                          {nutritionText ? (
                            <span className="muted-text">Nutrition: {nutritionText}</span>
                          ) : null}
                        </span>
                        <label className="inline-field">
                          <span>Servings</span>
                          <input
                            aria-label={`Servings for ${title}`}
                            min="1"
                            type="number"
                            value={templateServingDrafts[entry.id] ?? entry.servings}
                            onChange={(event) =>
                              onChangeServingDraft(entry.id, Number(event.target.value))
                            }
                          />
                        </label>
                        <label>
                          <span>Move to</span>
                          <select
                            aria-label={`Move ${title} to template day`}
                            value={templateMoveDrafts[entry.id] ?? day.id}
                            onChange={(event) => onChangeMoveDraft(entry.id, event.target.value)}
                          >
                            {plan.loopDays.map((targetDay) => (
                              <option key={targetDay.id} value={targetDay.id}>
                                {targetDay.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          aria-label={`Update ${title} template entry`}
                          className="text-button"
                          type="button"
                          onClick={() => onUpdateServings(entry.id)}
                        >
                          Update
                        </button>
                        <button
                          aria-label={`Move ${title} template entry`}
                          className="text-button"
                          type="button"
                          onClick={() => onMoveEntry(entry.id)}
                        >
                          Move template entry
                        </button>
                        <button
                          aria-label={`Remove ${title} template entry`}
                          className="text-button"
                          type="button"
                          onClick={() => onRemoveEntry(entry.id)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyView title="No meals planned" message="Add a saved recipe to this day." />
              )}

              <div className="form-grid">
                <label>
                  <span>Recipe</span>
                  <select
                    aria-label={`Recipe for ${day.label}`}
                    value={draft.recipeId}
                    onChange={(event) =>
                      onChangeEntryDraft(day.id, { ...draft, recipeId: event.target.value })
                    }
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
                    aria-label={`New servings for ${day.label}`}
                    min="1"
                    type="number"
                    value={draft.servings}
                    onChange={(event) =>
                      onChangeEntryDraft(day.id, {
                        ...draft,
                        servings: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onAddRecipe(day.id)}
                >
                  Add recipe
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function defaultBoardEntryDraft(): BoardEntryDraft {
  return {
    recipeId: "",
    servings: 1,
    slotId: noSlotValue,
    customSlotLabel: "",
    context: "eat",
  };
}

function defaultBoardConfigurationDraft(): BoardConfigurationDraft {
  return {
    preset: "customLoop",
    startDate: "",
    slotLabels: slotLabelsText(DEFAULT_PLANNER_SLOT_TEMPLATES),
    customDayLabels: "Training Day, Non-training Day",
  };
}

function boardConfigurationDraftFromBoard(board: PlannerBoard): BoardConfigurationDraft {
  return {
    preset: board.preset,
    startDate: board.startDate ?? "",
    slotLabels: slotLabelsText(board.slotTemplates),
    customDayLabels: board.days.map((day) => day.label).join(", "),
  };
}

function boardConfigurationDraftKey(plan: MealPlan) {
  const board = plan.board;

  if (!board) {
    return `${plan.id}:${plan.updatedAt}:no-board`;
  }

  const slots = board.slotTemplates.map((slot) => `${slot.id}:${slot.label}`).join("|");
  const days = board.days.map((day) => `${day.id}:${day.label}:${day.date ?? ""}`).join("|");

  return `${plan.id}:${plan.updatedAt}:${board.preset}:${board.startDate ?? ""}:${slots}:${days}`;
}

function slotPayload(slotId: string, customSlotLabel: string) {
  if (slotId === customSlotValue) {
    return { customSlotLabel };
  }

  return { slotId: slotIdOrUndefined(slotId) };
}

function slotIdOrUndefined(slotId: string | undefined) {
  return slotId && slotId !== noSlotValue && slotId !== customSlotValue ? slotId : undefined;
}

function labelsFromText(value: string) {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

function slotTemplatesFromText(value: string): ReadonlyArray<PlannerSlotTemplate> {
  const labels = labelsFromText(value);

  if (labels.length === 0) {
    return DEFAULT_PLANNER_SLOT_TEMPLATES;
  }

  return labels.map((label, index) => ({
    id: stableSlotId(label, index),
    label,
  }));
}

function slotLabelsText(slots: ReadonlyArray<PlannerSlotTemplate>) {
  return slots.map((slot) => slot.label).join(", ");
}

function stableSlotId(label: string, index: number) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `slot-${slug || "custom"}-${index + 1}`;
}

function boardEntryMeta(board: PlannerBoard, entry: PlannerBoardEntry) {
  const slotLabel =
    entry.customSlotLabel ??
    board.slotTemplates.find((slot) => slot.id === entry.slotId)?.label ??
    "No slot";
  const context = entry.context ?? "eat";

  return `${slotLabel} · ${context}`;
}

function recipeTitle(recipes: ReadonlyArray<Recipe>, recipeId: string) {
  return recipeById(recipes, recipeId)?.title ?? `Missing recipe ${recipeId}`;
}

function recipeById(recipes: ReadonlyArray<Recipe>, recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId);
}

function plannedNutritionText(recipe: Recipe, servings: number) {
  const summary = getPlannedNutritionSummary(recipe, servings);

  if (summary.length === 0) {
    return "";
  }

  return summary
    .map(
      (item) =>
        `${item.label} ${formatNutritionAmount(item.plannedAmount ?? item.recipeAmount)} ${
          item.unit
        }`,
    )
    .join(" · ");
}
