export const FORUM_REACTIONS = [
  { key: "like", emoji: "👍", label: "Me gusta" },
  { key: "love", emoji: "❤️", label: "Me encanta" },
  { key: "clap", emoji: "👏", label: "Bien ahí" },
  { key: "idea", emoji: "💡", label: "Buena idea" },
  { key: "question", emoji: "🤔", label: "Lo dudo" },
] as const;

export type ForumReactionKey = (typeof FORUM_REACTIONS)[number]["key"];

export function reactionMeta(key: string) {
  return FORUM_REACTIONS.find((r) => r.key === key) ?? FORUM_REACTIONS[0];
}

/** Counts per reaction, most used first. */
export function summarizeReactions(reactions: { reaction: string }[]) {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.reaction, (counts.get(r.reaction) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ ...reactionMeta(key), count }));
}
