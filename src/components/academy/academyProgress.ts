import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { countLabel } from "@/components/academy/academyLessonMeta";

type ProgressRow = { lesson_id: string; completed_at: string };

/** Admins share these components as a preview, so only producer sessions read or write progress. */
function useProgressProducerId() {
  const { user, isAdmin, isProductor } = useAuth();
  return isProductor && !isAdmin ? user?.id : undefined;
}

const progressKey = (producerId: string | undefined) => ["academy_lesson_progress", producerId];

export type AcademyProgress = {
  /** False for admin previews and when progress could not be loaded: show no progress at all. */
  tracked: boolean;
  loading: boolean;
  /** Completion time by lesson id. */
  completed: Map<string, string>;
};

export function useAcademyProgress(): AcademyProgress {
  const producerId = useProgressProducerId();
  const { data, isLoading } = useQuery({
    queryKey: progressKey(producerId),
    enabled: !!producerId,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_lesson_progress")
        .select("lesson_id, completed_at")
        .eq("producer_id", producerId!);
      if (error) throw error;
      return (data || []) as ProgressRow[];
    },
  });

  const completed = useMemo(
    () => new Map((data || []).map((row) => [row.lesson_id, row.completed_at])),
    [data],
  );

  return { tracked: !!data, loading: isLoading, completed };
}

export function useSetLessonCompleted() {
  const producerId = useProgressProducerId();
  const queryClient = useQueryClient();
  const key = progressKey(producerId);

  return useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (!producerId) throw new Error("Solo los productores registran progreso");
      const table = supabase.from("academy_lesson_progress");
      const { error } = completed
        ? await table.upsert(
            { producer_id: producerId, lesson_id: lessonId },
            { onConflict: "producer_id,lesson_id", ignoreDuplicates: true },
          )
        : await table.delete().eq("producer_id", producerId).eq("lesson_id", lessonId);
      if (error) throw error;
    },
    onMutate: async ({ lessonId, completed }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProgressRow[]>(key);
      const others = (previous || []).filter((row) => row.lesson_id !== lessonId);
      queryClient.setQueryData<ProgressRow[]>(
        key,
        completed ? [...others, { lesson_id: lessonId, completed_at: new Date().toISOString() }] : others,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error("No se pudo guardar tu progreso. Intentá de nuevo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export const countCompleted = (lessons: { id: string }[], completed: Map<string, string>) =>
  lessons.filter((l) => completed.has(l.id)).length;

/** "1 de 3 lecciones completadas". Unpublished lessons are not passed in, so they never count. */
export const progressLabel = (done: number, total: number) =>
  `${done} de ${countLabel(total, "lección", "lecciones")} ${total === 1 ? "completada" : "completadas"}`;

export type ResumePoint<T> = { status: "start" | "continue" | "done"; lesson: T };

/**
 * Where a producer should go next among `lessons`, given in course order: the first pending lesson
 * after their latest completion, wrapping round to any they skipped earlier.
 */
export function findResumePoint<T extends { id: string }>(
  lessons: T[],
  completed: Map<string, string>,
): ResumePoint<T> | null {
  if (!lessons.length) return null;

  const done = countCompleted(lessons, completed);
  if (done === 0) return { status: "start", lesson: lessons[0] };
  if (done === lessons.length) return { status: "done", lesson: lessons[0] };

  const time = (l: T) => Date.parse(completed.get(l.id) ?? "") || 0;
  const latest = lessons.reduce((best, l, i) => (time(l) > time(lessons[best]) ? i : best), 0);
  for (let step = 1; step < lessons.length; step++) {
    const lesson = lessons[(latest + step) % lessons.length];
    if (!completed.has(lesson.id)) return { status: "continue", lesson };
  }
  return null;
}
