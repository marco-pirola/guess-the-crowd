import { Locale, TranslationKey } from "@/lib/i18n/translations";
import { PublicQuestion, QuestionCategory } from "@/lib/types";

/**
 * Picks which language's text to display for a question. All 352 published
 * questions carry Italian text, but this still falls back to English if any
 * Italian field is ever missing (e.g. a future question added without it).
 * Never touches question.id or anything vote/score-affecting; display-only.
 */
export function localizeQuestion(
  question: Pick<PublicQuestion, "text" | "optionA" | "optionB" | "textIt" | "optionAIt" | "optionBIt">,
  locale: Locale
): { text: string; optionA: string; optionB: string } {
  if (locale !== "it") {
    return { text: question.text, optionA: question.optionA, optionB: question.optionB };
  }
  return {
    text: question.textIt ?? question.text,
    optionA: question.optionAIt ?? question.optionA,
    optionB: question.optionBIt ?? question.optionB,
  };
}

const CATEGORY_KEY: Record<QuestionCategory, TranslationKey> = {
  Food: "category_Food",
  Movies: "category_Movies",
  Sport: "category_Sport",
  Technology: "category_Technology",
  School: "category_School",
  "Everyday Life": "category_EverydayLife",
  Random: "category_Random",
  "Internet Culture": "category_InternetCulture",
};

export function categoryTranslationKey(category: QuestionCategory): TranslationKey {
  return CATEGORY_KEY[category];
}
