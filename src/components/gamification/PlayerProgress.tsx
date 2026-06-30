import { useEffect, useState } from "react";
import { ACHIEVEMENTS, LEVEL_NAMES, levelFromXp, xpProgressInLevel } from "../../data/achievements";
import { useGamification } from "../../hooks/useGamification";
import type { AchievementDef } from "../../types/gamification";

export function PlayerProgress({ compact }: { compact?: boolean }) {
  const { state } = useGamification();
  const level = levelFromXp(state.xp);
  const progress = xpProgressInLevel(state.xp);
  const levelName = LEVEL_NAMES[level - 1] ?? "Champion";
  const recent = state.unlocked
    .slice(-3)
    .reverse()
    .map((id) => ACHIEVEMENTS[id]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-neon/25 bg-neon/5 px-3 py-1">
        <span className="text-[10px] font-semibold text-neon">Lv.{level}</span>
        {state.streakDays > 1 && (
          <span className="text-[10px] text-amber-200">🔥 {state.streakDays}d</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neon/20 bg-gradient-to-br from-neon/5 to-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Testnet progress
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            Level {level} · {levelName}
          </p>
          <p className="text-[10px] text-muted">{state.xp} XP · {state.unlocked.length} badges</p>
        </div>
        {state.streakDays > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-center">
            <div className="text-lg leading-none">🔥</div>
            <div className="text-[10px] font-semibold text-amber-100">{state.streakDays}d</div>
          </div>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-void/80">
        <div
          className="h-full rounded-full bg-neon transition-all"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted">
        {progress.current} / {progress.next} XP to next level
      </p>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recent.map((a) => (
            <span
              key={a.id}
              title={a.description}
              className="rounded-full border border-border bg-void/60 px-2 py-0.5 text-[10px]"
            >
              {a.emoji} {a.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AchievementToast() {
  const { state } = useGamification();
  const [shown, setShown] = useState<AchievementDef | null>(null);
  const [lastCount, setLastCount] = useState(state.unlocked.length);

  useEffect(() => {
    if (state.unlocked.length > lastCount) {
      const id = state.unlocked[state.unlocked.length - 1];
      if (id) setShown(ACHIEVEMENTS[id]);
      setLastCount(state.unlocked.length);
    }
  }, [state.unlocked, lastCount]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 4500);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
      <div className="animate-slide-up flex max-w-[360px] items-center gap-3 rounded-2xl border border-neon/40 bg-card/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,229,160,0.15)] backdrop-blur-md">
        <span className="text-2xl">{shown.emoji}</span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-neon">Badge unlocked</p>
          <p className="text-sm font-semibold">{shown.title}</p>
          <p className="text-[10px] text-muted">+{shown.xp} XP · {shown.description}</p>
        </div>
      </div>
    </div>
  );
}
