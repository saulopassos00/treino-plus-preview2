"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type {
  AdaptId,
  CustomWorkout,
  DemoStore,
  Exercise,
  ProtocolExercise,
  ProtocolLevel,
  RunProgramId,
  User,
  WeeklyRoutineEntry,
  WorkoutHistoryEntry,
  WorkoutItem,
} from "@/types";

const STORAGE_KEY = "treino-live-demo-v2";

const defaultStore: DemoStore = {
  user: null,
  ownedWorkoutIds: [],
  ownedShopIds: [],
  premiumSubscribed: false,
  premiumRenewsAt: null,
  protocolProgress: { inter: 0, avancado: 0 },
  protocolStarted: { inter: false, avancado: false },
  protocolRemovedSessions: { inter: [], avancado: [] },
  protocolOverrides: { inter: {}, avancado: {} },
  protocolCompletedExerciseIds: { inter: {}, avancado: {} },
  weeklyRoutine: {},
  weeklyReminder: { enabled: false, time: "18:00", lastSentDate: null },
  workoutHistory: [],
  corridaDone: [],
  corridaActive: null,
  ebookChaptersRead: [],
  streak: 0,
  lastWorkoutAt: null,
  adaptationsSaved: [],
  customExercises: [],
  customWorkouts: [],
  selectedExerciseIds: [],
  savedPlanIds: [],
};

function migrate(raw: Partial<DemoStore>): DemoStore {
  const normalizeProtocolOverrides = (value: unknown): Record<string, ProtocolExercise[]> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([sessionId, entries]) => [
        sessionId,
        Array.isArray(entries)
          ? entries.flatMap((entry, index): ProtocolExercise[] => {
              if (!entry || typeof entry !== "object") return [];
              const item = entry as Partial<ProtocolExercise>;
              if (typeof item.id !== "string" || typeof item.name !== "string") return [];
              return [{
                id: item.id,
                name: item.name,
                order: Number.isFinite(item.order) ? Number(item.order) : index,
                ...(Number.isFinite(item.sets) ? { sets: Number(item.sets) } : {}),
                ...(typeof item.reps === "string" ? { reps: item.reps } : {}),
                ...(Number.isFinite(item.restSec) ? { restSec: Number(item.restSec) } : {}),
                ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
              }];
            })
          : [],
      ])
    );
  };
  const normalizeCompletedIds = (value: unknown): Record<string, string[]> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([sessionId, ids]) => [
        sessionId,
        Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [],
      ])
    );
  };
  const normalizeWeeklyRoutine = (value: unknown): Record<string, WeeklyRoutineEntry> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(([dateKey, entry]) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Partial<WeeklyRoutineEntry>;
        if (typeof item.activityId !== "string") return [];
        return [[dateKey, { activityId: item.activityId, completed: item.completed === true }]];
      })
    );
  };
  const overrides = raw.protocolOverrides as Partial<Record<ProtocolLevel, unknown>> | undefined;
  const completed = raw.protocolCompletedExerciseIds as Partial<Record<ProtocolLevel, unknown>> | undefined;
  return {
    ...defaultStore,
    ...raw,
    protocolProgress: {
      ...defaultStore.protocolProgress,
      ...(raw.protocolProgress || {}),
    },
    protocolStarted: {
      inter:
        raw.protocolStarted?.inter ?? (raw.protocolProgress?.inter ?? 0) > 0,
      avancado:
        raw.protocolStarted?.avancado ?? (raw.protocolProgress?.avancado ?? 0) > 0,
    },
    protocolRemovedSessions: {
      inter: Array.isArray(raw.protocolRemovedSessions?.inter)
        ? raw.protocolRemovedSessions.inter
        : [],
      avancado: Array.isArray(raw.protocolRemovedSessions?.avancado)
        ? raw.protocolRemovedSessions.avancado
        : [],
    },
    protocolOverrides: {
      inter: normalizeProtocolOverrides(overrides?.inter),
      avancado: normalizeProtocolOverrides(overrides?.avancado),
    },
    protocolCompletedExerciseIds: {
      inter: normalizeCompletedIds(completed?.inter),
      avancado: normalizeCompletedIds(completed?.avancado),
    },
    weeklyRoutine: normalizeWeeklyRoutine(raw.weeklyRoutine),
    weeklyReminder: {
      enabled: raw.weeklyReminder?.enabled === true,
      time: typeof raw.weeklyReminder?.time === "string" && /^\d{2}:\d{2}$/.test(raw.weeklyReminder.time)
        ? raw.weeklyReminder.time
        : defaultStore.weeklyReminder.time,
      lastSentDate: typeof raw.weeklyReminder?.lastSentDate === "string"
        ? raw.weeklyReminder.lastSentDate
        : null,
    },
    workoutHistory: Array.isArray(raw.workoutHistory)
      ? raw.workoutHistory.filter((entry): entry is WorkoutHistoryEntry =>
          !!entry && typeof entry.id === "string" && typeof entry.title === "string" &&
          typeof entry.date === "string" && Array.isArray(entry.exercises)
        )
      : [],
    ownedWorkoutIds: Array.isArray(raw.ownedWorkoutIds) ? raw.ownedWorkoutIds : [],
    ownedShopIds: Array.isArray(raw.ownedShopIds) ? raw.ownedShopIds : [],
    corridaDone: Array.isArray(raw.corridaDone) ? raw.corridaDone : [],
    ebookChaptersRead: Array.isArray(raw.ebookChaptersRead) ? raw.ebookChaptersRead : [],
    adaptationsSaved: Array.isArray(raw.adaptationsSaved) ? raw.adaptationsSaved : [],
    customExercises: Array.isArray(raw.customExercises) ? raw.customExercises : [],
    customWorkouts: Array.isArray(raw.customWorkouts)
      ? raw.customWorkouts.map((workout) => ({
          ...workout,
          items: Array.isArray(workout.items) ? workout.items : [],
          scheduledDays: Array.isArray(workout.scheduledDays) ? workout.scheduledDays : [],
        }))
      : [],
    selectedExerciseIds: Array.isArray(raw.selectedExerciseIds)
      ? Array.from(new Set(raw.selectedExerciseIds.filter((id): id is string => typeof id === "string" && id.length <= 80)))
      : [],
    savedPlanIds: Array.isArray(raw.savedPlanIds) ? raw.savedPlanIds : [],
  };
}

function readStore(): DemoStore {
  if (typeof window === "undefined") return defaultStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const v1 = localStorage.getItem("treino-live-demo-v1");
      if (v1) {
        const migrated = migrate(JSON.parse(v1) as Partial<DemoStore>);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return defaultStore;
    }
    return migrate(JSON.parse(raw) as Partial<DemoStore>);
  } catch {
    // Storage pode estar indisponível ou conter JSON inválido; mantém o app funcional.
    return defaultStore;
  }
}

// useSyncExternalStore exige que getSnapshot devolva a mesma referência enquanto
// o estado não muda. Cachear a leitura também evita recriar objetos em cada render.
let currentStore: DemoStore = defaultStore;
let hasLoadedStore = false;

function getSnapshot(): DemoStore {
  if (!hasLoadedStore) {
    currentStore = readStore();
    hasLoadedStore = true;
  }
  return currentStore;
}

function getServerSnapshot(): DemoStore {
  return defaultStore;
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function writeStore(next: DemoStore) {
  currentStore = migrate(next);
  hasLoadedStore = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStore));
  } catch {
    // Mantém o estado da sessão utilizável mesmo se persistência local falhar.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Sincroniza abas abertas no mesmo navegador sem gerar notificações duplicadas.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      currentStore = readStore();
      hasLoadedStore = true;
      notify();
    }
  });
}

function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${uuid ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
}

function bumpStreak(cur: DemoStore): Pick<DemoStore, "streak" | "lastWorkoutAt"> {
  const today = new Date().toISOString().slice(0, 10);
  const last = cur.lastWorkoutAt?.slice(0, 10) ?? null;
  if (last === today) {
    return { streak: cur.streak || 1, lastWorkoutAt: cur.lastWorkoutAt };
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  const next = last === y ? (cur.streak || 0) + 1 : 1;
  return { streak: next, lastWorkoutAt: new Date().toISOString() };
}

export function useDemoStore() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signIn = useCallback((email: string, name?: string) => {
    const user: User = {
      email: email.trim().toLowerCase(),
      name: name?.trim() || email.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    writeStore({ ...getSnapshot(), user });
  }, []);

  const signOut = useCallback(() => {
    writeStore({ ...getSnapshot(), user: null });
  }, []);

  const purchaseWorkout = useCallback((workoutId: string) => {
    const cur = getSnapshot();
    if (cur.ownedWorkoutIds.includes(workoutId)) return;
    writeStore({ ...cur, ownedWorkoutIds: [...cur.ownedWorkoutIds, workoutId] });
  }, []);

  const purchaseShopItem = useCallback((shopId: string) => {
    const cur = getSnapshot();
    if (cur.ownedShopIds.includes(shopId)) return;
    writeStore({ ...cur, ownedShopIds: [...cur.ownedShopIds, shopId] });
  }, []);

  const subscribePremium = useCallback(() => {
    const renews = new Date();
    renews.setMonth(renews.getMonth() + 1);
    writeStore({ ...getSnapshot(), premiumSubscribed: true, premiumRenewsAt: renews.toISOString() });
  }, []);

  const cancelPremium = useCallback(() => {
    writeStore({ ...getSnapshot(), premiumSubscribed: false, premiumRenewsAt: null });
  }, []);

  const startProtocol = useCallback((level: ProtocolLevel) => {
    const cur = getSnapshot();
    writeStore({
      ...cur,
      protocolStarted: { ...cur.protocolStarted, [level]: true },
    });
  }, []);

  const bumpProtocol = useCallback((level: ProtocolLevel, delta = 12) => {
    const cur = getSnapshot();
    const next = Math.min(100, (cur.protocolProgress[level] || 0) + delta);
    writeStore({
      ...cur,
      protocolStarted: { ...cur.protocolStarted, [level]: true },
      protocolProgress: { ...cur.protocolProgress, [level]: next },
      ...bumpStreak(cur),
    });
  }, []);

  const toggleProtocolInPlan = useCallback((level: ProtocolLevel): boolean => {
    const cur = getSnapshot();
    const inPlan = !cur.protocolStarted[level];
    writeStore({
      ...cur,
      protocolStarted: { ...cur.protocolStarted, [level]: inPlan },
    });
    return inPlan;
  }, []);

  const removeProtocolSession = useCallback((level: ProtocolLevel, title: string) => {
    const cur = getSnapshot();
    const current = cur.protocolRemovedSessions[level];
    if (current.includes(title)) return;
    writeStore({
      ...cur,
      protocolRemovedSessions: {
        ...cur.protocolRemovedSessions,
        [level]: [...current, title],
      },
    });
  }, []);

  const restoreProtocolSessions = useCallback((level: ProtocolLevel) => {
    const cur = getSnapshot();
    if (cur.protocolRemovedSessions[level].length === 0) return;
    writeStore({
      ...cur,
      protocolRemovedSessions: {
        ...cur.protocolRemovedSessions,
        [level]: [],
      },
    });
  }, []);

  const resetProtocolProgress = useCallback((level: ProtocolLevel) => {
    const cur = getSnapshot();
    writeStore({
      ...cur,
      protocolProgress: { ...cur.protocolProgress, [level]: 0 },
    });
  }, []);

  const addProtocolExercise = useCallback((
    level: ProtocolLevel,
    sessionId: string,
    input: Omit<ProtocolExercise, "id" | "order">
  ): string | null => {
    const name = input.name.trim();
    if (!name || !sessionId.trim()) return null;
    const cur = getSnapshot();
    const existing = cur.protocolOverrides[level][sessionId] ?? [];
    const exercise: ProtocolExercise = {
      ...input,
      id: createId("protocol-exercise"),
      name,
      order: existing.length,
      reps: input.reps?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
    writeStore({
      ...cur,
      protocolOverrides: {
        ...cur.protocolOverrides,
        [level]: { ...cur.protocolOverrides[level], [sessionId]: [...existing, exercise] },
      },
    });
    return exercise.id;
  }, []);

  const updateProtocolExercise = useCallback((
    level: ProtocolLevel,
    sessionId: string,
    exerciseId: string,
    updates: Partial<Omit<ProtocolExercise, "id" | "order">>
  ): boolean => {
    const cur = getSnapshot();
    const existing = cur.protocolOverrides[level][sessionId] ?? [];
    if (!existing.some((exercise) => exercise.id === exerciseId)) return false;
    writeStore({
      ...cur,
      protocolOverrides: {
        ...cur.protocolOverrides,
        [level]: {
          ...cur.protocolOverrides[level],
          [sessionId]: existing.map((exercise) => exercise.id === exerciseId
            ? {
                ...exercise,
                ...updates,
                name: updates.name?.trim() || exercise.name,
                reps: updates.reps === undefined ? exercise.reps : updates.reps.trim() || undefined,
                notes: updates.notes === undefined ? exercise.notes : updates.notes.trim() || undefined,
              }
            : exercise),
        },
      },
    });
    return true;
  }, []);

  const removeProtocolExercise = useCallback((
    level: ProtocolLevel,
    sessionId: string,
    exerciseId: string
  ): boolean => {
    const cur = getSnapshot();
    const existing = cur.protocolOverrides[level][sessionId] ?? [];
    if (!existing.some((exercise) => exercise.id === exerciseId)) return false;
    const exercises = existing
      .filter((exercise) => exercise.id !== exerciseId)
      .map((exercise, order) => ({ ...exercise, order }));
    const completed = cur.protocolCompletedExerciseIds[level][sessionId] ?? [];
    writeStore({
      ...cur,
      protocolOverrides: {
        ...cur.protocolOverrides,
        [level]: { ...cur.protocolOverrides[level], [sessionId]: exercises },
      },
      protocolCompletedExerciseIds: {
        ...cur.protocolCompletedExerciseIds,
        [level]: {
          ...cur.protocolCompletedExerciseIds[level],
          [sessionId]: completed.filter((id) => id !== exerciseId),
        },
      },
    });
    return true;
  }, []);

  const reorderProtocolExercises = useCallback((
    level: ProtocolLevel,
    sessionId: string,
    orderedIds: string[]
  ): boolean => {
    const cur = getSnapshot();
    const existing = cur.protocolOverrides[level][sessionId] ?? [];
    if (orderedIds.length !== existing.length) return false;
    const byId = new Map(existing.map((exercise) => [exercise.id, exercise]));
    if (new Set(orderedIds).size !== existing.length || orderedIds.some((id) => !byId.has(id))) return false;
    const exercises = orderedIds.map((id, order) => ({ ...byId.get(id)!, order }));
    writeStore({
      ...cur,
      protocolOverrides: {
        ...cur.protocolOverrides,
        [level]: { ...cur.protocolOverrides[level], [sessionId]: exercises },
      },
    });
    return true;
  }, []);

  const toggleProtocolExerciseCompleted = useCallback((
    level: ProtocolLevel,
    sessionId: string,
    exerciseId: string
  ): boolean => {
    const cur = getSnapshot();
    const active = cur.protocolOverrides[level][sessionId] ?? [];
    if (!active.some((exercise) => exercise.id === exerciseId)) return false;
    const completed = cur.protocolCompletedExerciseIds[level][sessionId] ?? [];
    const isCompleted = completed.includes(exerciseId);
    writeStore({
      ...cur,
      protocolCompletedExerciseIds: {
        ...cur.protocolCompletedExerciseIds,
        [level]: {
          ...cur.protocolCompletedExerciseIds[level],
          [sessionId]: isCompleted
            ? completed.filter((id) => id !== exerciseId)
            : [...completed, exerciseId],
        },
      },
    });
    return !isCompleted;
  }, []);

  const updateWeeklyRoutineItem = useCallback((
    dateKey: string,
    updates: Partial<WeeklyRoutineEntry>
  ) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const cur = getSnapshot();
    const existing = cur.weeklyRoutine[dateKey] ?? { activityId: "", completed: false };
    const activityId = updates.activityId ?? existing.activityId;
    const completed = updates.activityId !== undefined && updates.activityId !== existing.activityId
      ? false
      : updates.completed ?? existing.completed;
    writeStore({
      ...cur,
      weeklyRoutine: {
        ...cur.weeklyRoutine,
        [dateKey]: { activityId, completed },
      },
    });
  }, []);

  const clearWeeklyRoutine = useCallback((dateKeys: string[]) => {
    const cur = getSnapshot();
    const keys = new Set(dateKeys);
    writeStore({
      ...cur,
      weeklyRoutine: Object.fromEntries(
        Object.entries(cur.weeklyRoutine).filter(([dateKey]) => !keys.has(dateKey))
      ),
    });
  }, []);

  const moveWeeklyRoutineItem = useCallback((fromDate: string, toDate: string): boolean => {
    if (![fromDate, toDate].every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)) || fromDate === toDate) return false;
    const cur = getSnapshot();
    const source = cur.weeklyRoutine[fromDate];
    if (!source?.activityId || cur.weeklyRoutine[toDate]?.activityId) return false;
    writeStore({
      ...cur,
      weeklyRoutine: {
        ...cur.weeklyRoutine,
        [fromDate]: { activityId: "", completed: false },
        [toDate]: { activityId: source.activityId, completed: false },
      },
    });
    return true;
  }, []);

  const setWeeklyReminder = useCallback((enabled: boolean, time?: string) => {
    const cur = getSnapshot();
    writeStore({
      ...cur,
      weeklyReminder: {
        ...cur.weeklyReminder,
        enabled,
        time: time && /^\d{2}:\d{2}$/.test(time) ? time : cur.weeklyReminder.time,
      },
    });
  }, []);

  const markWeeklyReminderSent = useCallback((date: string) => {
    const cur = getSnapshot();
    if (cur.weeklyReminder.lastSentDate === date) return;
    writeStore({ ...cur, weeklyReminder: { ...cur.weeklyReminder, lastSentDate: date } });
  }, []);

  const logTrainingSession = useCallback((input: Omit<WorkoutHistoryEntry, "id" | "date"> & { date?: string }): string | null => {
    const title = input.title.trim();
    if (!title || !input.exercises.length) return null;
    const entry: WorkoutHistoryEntry = {
      id: createId("session"),
      title,
      date: input.date ?? new Date().toISOString(),
      source: input.source,
      exercises: input.exercises.map((exercise) => ({
        ...exercise,
        id: exercise.id || createId("history-exercise"),
        name: exercise.name.trim(),
      })).filter((exercise) => exercise.name),
    };
    if (!entry.exercises.length) return null;
    const cur = getSnapshot();
    writeStore({ ...cur, workoutHistory: [entry, ...cur.workoutHistory], ...bumpStreak(cur) });
    return entry.id;
  }, []);

  const toggleCorridaDay = useCallback((key: string) => {
    const cur = getSnapshot();
    const has = cur.corridaDone.includes(key);
    const corridaDone = has
      ? cur.corridaDone.filter((item) => item !== key)
      : [...cur.corridaDone, key];
    writeStore({ ...cur, corridaDone, ...(has ? {} : bumpStreak(cur)) });
  }, []);

  const activateCorrida = useCallback((program: RunProgramId) => {
    writeStore({ ...getSnapshot(), corridaActive: program });
  }, []);

  const markEbookChapter = useCallback((chapterId: string) => {
    const cur = getSnapshot();
    if (cur.ebookChaptersRead.includes(chapterId)) return;
    writeStore({ ...cur, ebookChaptersRead: [...cur.ebookChaptersRead, chapterId] });
  }, []);

  const completeFastWorkout = useCallback(() => {
    const cur = getSnapshot();
    writeStore({ ...cur, ...bumpStreak(cur) });
  }, []);

  const saveAdaptation = useCallback((id: AdaptId) => {
    const cur = getSnapshot();
    if (cur.adaptationsSaved.includes(id)) return;
    writeStore({ ...cur, adaptationsSaved: [...cur.adaptationsSaved, id] });
  }, []);

  const createCustomExercise = useCallback((
    input: Omit<Exercise, "id" | "isCustom" | "createdAt" | "updatedAt">
  ): string | null => {
    const name = input.name.trim();
    if (!name) return null;
    const now = new Date().toISOString();
    const exercise: Exercise = {
      ...input,
      id: createId("exercise"),
      name,
      muscleGroup: input.muscleGroup.trim(),
      equipment: input.equipment?.trim() || undefined,
      videoUrl: input.videoUrl?.trim() || undefined,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };
    const cur = getSnapshot();
    writeStore({ ...cur, customExercises: [...cur.customExercises, exercise] });
    return exercise.id;
  }, []);

  const updateCustomExercise = useCallback((
    exerciseId: string,
    updates: Partial<Omit<Exercise, "id" | "isCustom" | "createdAt" | "updatedAt">>
  ): boolean => {
    const cur = getSnapshot();
    const exists = cur.customExercises.some((exercise) => exercise.id === exerciseId);
    if (!exists) return false;
    writeStore({
      ...cur,
      customExercises: cur.customExercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              ...updates,
              name: updates.name?.trim() || exercise.name,
              muscleGroup: updates.muscleGroup?.trim() ?? exercise.muscleGroup,
              equipment: updates.equipment === undefined
                ? exercise.equipment
                : updates.equipment.trim() || undefined,
              videoUrl: updates.videoUrl === undefined
                ? exercise.videoUrl
                : updates.videoUrl.trim() || undefined,
              updatedAt: new Date().toISOString(),
            }
          : exercise
      ),
    });
    return true;
  }, []);

  const deleteCustomExercise = useCallback((exerciseId: string): boolean => {
    const cur = getSnapshot();
    if (!cur.customExercises.some((exercise) => exercise.id === exerciseId)) return false;
    // Não deixa itens de treinos existentes apontarem para um exercício removido.
    const customWorkouts = cur.customWorkouts.map((workout) => ({
      ...workout,
      items: workout.items.filter((item) => item.exerciseId !== exerciseId),
      updatedAt: workout.items.some((item) => item.exerciseId === exerciseId)
        ? new Date().toISOString()
        : workout.updatedAt,
    }));
    writeStore({
      ...cur,
      customExercises: cur.customExercises.filter((exercise) => exercise.id !== exerciseId),
      customWorkouts,
    });
    return true;
  }, []);

  const createCustomWorkout = useCallback((title: string, goal?: string): string | null => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;
    const now = new Date().toISOString();
    const workout: CustomWorkout = {
      id: createId("workout"),
      title: cleanTitle,
      goal: goal?.trim() || undefined,
      items: [],
      scheduledDays: [],
      createdAt: now,
      updatedAt: now,
    };
    const cur = getSnapshot();
    writeStore({ ...cur, customWorkouts: [...cur.customWorkouts, workout] });
    return workout.id;
  }, []);

  const updateCustomWorkout = useCallback((
    workoutId: string,
    updates: Partial<Pick<CustomWorkout, "title" | "goal" | "scheduledDays">>
  ): boolean => {
    const cur = getSnapshot();
    if (!cur.customWorkouts.some((workout) => workout.id === workoutId)) return false;
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              ...updates,
              title: updates.title?.trim() || workout.title,
              goal: updates.goal === undefined ? workout.goal : updates.goal.trim() || undefined,
              scheduledDays: updates.scheduledDays
                ? Array.from(new Set(updates.scheduledDays))
                : workout.scheduledDays,
              updatedAt: new Date().toISOString(),
            }
          : workout
      ),
    });
    return true;
  }, []);

  const deleteCustomWorkout = useCallback((workoutId: string): boolean => {
    const cur = getSnapshot();
    if (!cur.customWorkouts.some((workout) => workout.id === workoutId)) return false;
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.filter((workout) => workout.id !== workoutId),
      savedPlanIds: cur.savedPlanIds.filter((id) => id !== workoutId),
    });
    return true;
  }, []);

  const addWorkoutItem = useCallback((
    workoutId: string,
    exerciseId: string,
    config: Partial<Pick<WorkoutItem, "sets" | "reps" | "durationSec" | "restSec" | "notes">> = {}
  ): string | null => {
    const cur = getSnapshot();
    const workout = cur.customWorkouts.find((item) => item.id === workoutId);
    if (!workout || !exerciseId.trim()) return null;
    const now = new Date().toISOString();
    const item: WorkoutItem = {
      id: createId("item"),
      exerciseId: exerciseId.trim(),
      order: workout.items.length,
      ...config,
      notes: config.notes?.trim() || undefined,
    };
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.map((workout) =>
        workout.id === workoutId
          ? { ...workout, items: [...workout.items, item], updatedAt: now }
          : workout
      ),
    });
    return item.id;
  }, []);

  const updateWorkoutItem = useCallback((
    workoutId: string,
    itemId: string,
    updates: Partial<Omit<WorkoutItem, "id" | "exerciseId" | "order">>
  ): boolean => {
    const cur = getSnapshot();
    const workout = cur.customWorkouts.find((item) => item.id === workoutId);
    if (!workout?.items.some((item) => item.id === itemId)) return false;
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.map((item) =>
        item.id === workoutId
          ? {
              ...item,
              items: item.items.map((exercise) =>
                exercise.id === itemId ? { ...exercise, ...updates } : exercise
              ),
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    });
    return true;
  }, []);

  const removeWorkoutItem = useCallback((workoutId: string, itemId: string): boolean => {
    const cur = getSnapshot();
    const workout = cur.customWorkouts.find((item) => item.id === workoutId);
    if (!workout?.items.some((item) => item.id === itemId)) return false;
    const now = new Date().toISOString();
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.map((item) => {
        if (item.id !== workoutId) return item;
        const items = item.items
          .filter((exercise) => exercise.id !== itemId)
          .map((exercise, order) => ({ ...exercise, order }));
        return { ...item, items, updatedAt: now };
      }),
    });
    return true;
  }, []);

  const reorderWorkoutItems = useCallback((workoutId: string, orderedItemIds: string[]): boolean => {
    const cur = getSnapshot();
    const workout = cur.customWorkouts.find((item) => item.id === workoutId);
    if (!workout || orderedItemIds.length !== workout.items.length) return false;
    const itemsById = new Map(workout.items.map((item) => [item.id, item]));
    if (new Set(orderedItemIds).size !== workout.items.length || orderedItemIds.some((id) => !itemsById.has(id))) {
      return false;
    }
    const items = orderedItemIds.map((id, order) => ({ ...itemsById.get(id)!, order }));
    writeStore({
      ...cur,
      customWorkouts: cur.customWorkouts.map((item) =>
        item.id === workoutId ? { ...item, items, updatedAt: new Date().toISOString() } : item
      ),
    });
    return true;
  }, []);

  const toggleSavedPlan = useCallback((planId: string) => {
    const cur = getSnapshot();
    const saved = cur.savedPlanIds.includes(planId);
    writeStore({
      ...cur,
      savedPlanIds: saved
        ? cur.savedPlanIds.filter((id) => id !== planId)
        : [...cur.savedPlanIds, planId],
    });
    return !saved;
  }, []);

  const selectExercise = useCallback((exerciseId: string): boolean => {
    const id = exerciseId.trim();
    if (!id || id.length > 80) return false;
    const cur = getSnapshot();
    if (cur.selectedExerciseIds.includes(id)) return false;
    writeStore({ ...cur, selectedExerciseIds: [...cur.selectedExerciseIds, id] });
    return true;
  }, []);

  const deselectExercise = useCallback((exerciseId: string): boolean => {
    const cur = getSnapshot();
    if (!cur.selectedExerciseIds.includes(exerciseId)) return false;
    writeStore({ ...cur, selectedExerciseIds: cur.selectedExerciseIds.filter((id) => id !== exerciseId) });
    return true;
  }, []);

  const resetDemo = useCallback(() => {
    writeStore(defaultStore);
  }, []);

  const owns = useCallback(
    (workoutId: string) => store.ownedWorkoutIds.includes(workoutId),
    [store.ownedWorkoutIds]
  );
  const ownsShop = useCallback(
    (shopId: string) => store.ownedShopIds.includes(shopId),
    [store.ownedShopIds]
  );

  return {
    ...store,
    signIn,
    signOut,
    purchaseWorkout,
    purchaseShopItem,
    subscribePremium,
    cancelPremium,
    startProtocol,
    bumpProtocol,
    removeProtocolSession,
    restoreProtocolSessions,
    resetProtocolProgress,
    addProtocolExercise,
    updateProtocolExercise,
    removeProtocolExercise,
    reorderProtocolExercises,
    toggleProtocolExerciseCompleted,
    updateWeeklyRoutineItem,
    clearWeeklyRoutine,
    moveWeeklyRoutineItem,
    setWeeklyReminder,
    markWeeklyReminderSent,
    logTrainingSession,
    toggleProtocolInPlan,
    toggleCorridaDay,
    activateCorrida,
    markEbookChapter,
    completeFastWorkout,
    saveAdaptation,
    createCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    createCustomWorkout,
    updateCustomWorkout,
    deleteCustomWorkout,
    addWorkoutItem,
    updateWorkoutItem,
    removeWorkoutItem,
    reorderWorkoutItems,
    toggleSavedPlan,
    selectExercise,
    deselectExercise,
    resetDemo,
    owns,
    ownsShop,
  };
}

export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
