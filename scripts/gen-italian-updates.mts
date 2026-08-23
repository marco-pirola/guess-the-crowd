import { seedQuestions } from "../src/lib/store/seedQuestions";

/**
 * Emits `update questions set text_it = ... where id = ...` statements for
 * every seed question that currently has Italian text. Re-run
 * (`npx tsx scripts/gen-italian-updates.mts`) and paste the output into a new
 * migration file whenever more questions gain textIt/optionAIt/optionBIt —
 * this is additive, so re-running it for already-migrated questions is safe
 * (it only ever updates the _it columns of matching ids).
 */
function esc(s: string) {
  return s.replace(/'/g, "''");
}

const localized = seedQuestions.filter((q) => q.textIt && q.optionAIt && q.optionBIt);

const lines = localized.map(
  (q) =>
    `update questions set text_it = '${esc(q.textIt!)}', option_a_it = '${esc(
      q.optionAIt!
    )}', option_b_it = '${esc(q.optionBIt!)}' where id = '${q.id}';`
);

console.log(`-- ${localized.length} of ${seedQuestions.length} questions have Italian text.`);
console.log(lines.join("\n"));
