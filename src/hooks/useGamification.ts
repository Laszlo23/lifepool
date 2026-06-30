import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ACHIEVEMENTS } from "../data/achievements";
import type { AchievementDef, AchievementId, GamificationState } from "../types/gamification";

const STORAGE_KEY = "lifepool_game_v1";

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  unlocked: [],
  streakDays: 0,
  lastVisitDate: null,
  totalVisits: 0,
};

let state: GamificationState = loadState();
const listeners = new Set<() => void>();

function loadState(): GamificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) } as GamificationState;
  } catch {
    return DEFAULT_STATE;
  }
}

function persist(next: GamificationState) {
  state = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function recordVisit(): GamificationState {
  const today = todayKey();
  if (state.lastVisitDate === today) return state;

  let streakDays = 1;
  if (state.lastVisitDate === yesterdayKey()) {
    streakDays = state.streakDays + 1;
  }

  const next: GamificationState = {
    ...state,
    streakDays,
    lastVisitDate: today,
    totalVisits: state.totalVisits + 1,
  };
  persist(next);

  if (streakDays >= 3) unlockAchievement("streak_3");
  if (streakDays >= 7) unlockAchievement("streak_7");

  return next;
}

export function unlockAchievement(id: AchievementId): AchievementDef | null {
  if (state.unlocked.includes(id)) return null;
  const def = ACHIEVEMENTS[id];
  const next: GamificationState = {
    ...state,
    unlocked: [...state.unlocked, id],
    xp: state.xp + def.xp,
  };
  persist(next);
  return def;
}

export function useGamification() {
  const gameState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    recordVisit();
  }, []);

  const unlock = useCallback((id: AchievementId) => unlockAchievement(id), []);

  return { state: gameState, unlock };
}
