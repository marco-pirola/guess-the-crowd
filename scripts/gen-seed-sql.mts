import { seedQuestions } from "../src/lib/store/seedQuestions";

function esc(s: string) {
  return s.replace(/'/g, "''");
}

const lines = seedQuestions.map((q) => {
  return `  ('${q.id}', '${esc(q.text)}', '${q.category}', '${esc(q.optionA)}', '${esc(
    q.optionB
  )}', '${q.emojiA}', '${q.emojiB}', ${q.seededResultPercentageA}, ${q.minimumVotes}, 'published')`;
});

console.log(
  "-- Generated from src/lib/store/seedQuestions.ts — run `npm run gen:seed-sql`\n" +
    "-- to regenerate after editing the question list. Run after schema.sql.\n" +
    "insert into questions (id, text, category, option_a, option_b, emoji_a, emoji_b, seeded_result_percentage_a, minimum_votes, status) values\n" +
    lines.join(",\n") +
    "\non conflict (id) do nothing;"
);
