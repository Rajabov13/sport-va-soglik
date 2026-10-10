/**
 * Automated pre-moderation for new requests. Requests that pass are auto-verified;
 * anything flagged waits in the admin moderation queue (status PENDING).
 */
const BLOCKED_PATTERNS = [
  /\b(casino|kazino|казино|bet|ставк[аи]|crypto|kripto|крипто)\b/i,
  /\b(viagra|loan|kredit beramiz|займ)\b/i,
  /\b(18\+|xxx|porn)\b/i,
];

export interface ModerationInput {
  title: string;
  description: string;
  additionalInfo?: string | null;
  recentRequestsByUser: number;
  openReportsAgainstUser: number;
  duplicateTitle: boolean;
}

export type ModerationFlag = "blockedContent" | "tooManyLinks" | "tooManyRequests" | "reportedUser" | "duplicate" | "shouting";

export function moderateRequest(input: ModerationInput): { approved: boolean; flags: ModerationFlag[] } {
  const flags: ModerationFlag[] = [];
  const text = `${input.title}\n${input.description}\n${input.additionalInfo ?? ""}`;
  if (BLOCKED_PATTERNS.some((p) => p.test(text))) flags.push("blockedContent");
  if ((text.match(/https?:\/\//gi) ?? []).length > 2) flags.push("tooManyLinks");
  if (input.recentRequestsByUser >= 5) flags.push("tooManyRequests");
  if (input.openReportsAgainstUser >= 2) flags.push("reportedUser");
  if (input.duplicateTitle) flags.push("duplicate");
  const letters = input.title.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 10 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) flags.push("shouting");
  return { approved: flags.length === 0, flags };
}
