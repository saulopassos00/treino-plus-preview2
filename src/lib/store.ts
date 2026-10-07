"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type {
  AdaptId,
  CustomWorkout,
  DemoStore,
  Exercise,
  ProtocolLevel,
  RunProgramId,
  User,
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
  corridaDone: [],
  corridaActive: null,
  ebookChaptersRead: [],
  streak: 0,
  lastWorkoutAt: null,
  adaptationsSaved: [],
  customExercises: [],
  customWorkouts: [],
  savedPlanIds: [],
};

function migrate(raw: Partial<DemoStore>): DemoStore {
  return {
    ...defaultStore,
    ...raw,
    protocolProgress: {
      ...defaultStore.protocolProgress,
      ...(raw.protocolProgress || {}),
    },
    protocolStarted: {
      ...defaultStore.protocolStarted,
      ...(raw.protocolStarted || {}),
    },
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
    const progress = { ...cur.protocolProgress };
    if (progress[level] <= 0) progress[level] = 8;
    writeStore({
      ...cur,
      protocolStarted: { ...cur.protocolStarted, [level]: true },
      protocolProgress: progress,
      ...bumpStreak(cur),
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
