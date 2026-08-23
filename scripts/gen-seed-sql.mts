import { seedQuestions } from "../src/lib/store/seedQuestions";

function esc(s: string) {
  return s.replace(/'/g, "''");
}

/** null (no Italian text yet) becomes SQL NULL, not the string "null". */
function escNullable(s: string | null | undefined) {
  return s == null ? "null" : `'${esc(s)}'`;
}

const lines = seedQuestions.map((q) => {
  return `  ('${q.id}', '${esc(q.text)}', '${q.category}', '${esc(q.optionA)}', '${esc(
    q.optionB
  )}', '${q.emojiA}', '${q.emojiB}', ${q.seededResultPercentageA}, ${q.minimumVotes}, 'published', ${escNullable(
    q.textIt
  )}, ${escNullable(q.optionAIt)}, ${escNullable(q.optionBIt)})`;
});

console.log(
  "-- Generated from src/lib/store/seedQuestions.ts — run `npm run gen:seed-sql`\n" +
    "-- to regenerate after editing the question list. Run after schema.sql and functions.sql.\n" +
    "-- Requires the text_it/option_a_it/option_b_it columns from\n" +
    "-- supabase/migration_italian_localization.sql on a fresh database.\n" +
    "insert into questions (id, text, category, option_a, option_b, emoji_a, emoji_b, seeded_result_percentage_a, minimum_votes, status, text_it, option_a_it, option_b_it) values\n" +
    lines.join(",\n") +
    "\non conflict (id) do nothing;"
);
