import type { QueryClient } from "@tanstack/react-query";

export function invalidateAcademyQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["academy_modules"] }),
    queryClient.invalidateQueries({ queryKey: ["academy_modules_library"] }),
    queryClient.invalidateQueries({ queryKey: ["academy_lesson"] }),
  ]);
}
