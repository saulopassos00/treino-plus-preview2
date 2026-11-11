import { PROTO_ADV_BLOCKS, PROTO_INTER_SESSIONS } from "@/lib/content";
import type { DemoStore, ProtocolLevel } from "@/types";

/**
 * O progresso passa a refletir exercícios marcados como concluídos.
 * O percentual legado (incrementos manuais) não é apresentado como progresso real.
 */
export function getProtocolProgress(
  store: Pick<DemoStore, "protocolOverrides" | "protocolCompletedExerciseIds" | "protocolRemovedSessions">,
  level: ProtocolLevel
): number {
  const sessions = level === "inter" ? PROTO_INTER_SESSIONS : PROTO_ADV_BLOCKS;
  const removed = new Set(store.protocolRemovedSessions[level] ?? []);
  const overrides = store.protocolOverrides[level] ?? {};
  const activeExercises = sessions
    .filter((session) => !removed.has(session.title))
    .flatMap((session) => overrides[session.id] ?? []);

  if (activeExercises.length === 0) return 0;

  const completedIds = new Set(
    Object.values(store.protocolCompletedExerciseIds[level] ?? {}).flat()
  );
  const completedCount = activeExercises.filter((exercise) => completedIds.has(exercise.id)).length;
  return Math.round((completedCount / activeExercises.length) * 100);
}
