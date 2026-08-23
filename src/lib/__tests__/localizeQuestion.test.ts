import { describe, expect, it } from "vitest";
import { categoryTranslationKey, localizeQuestion } from "@/lib/i18n/localizeQuestion";
import { dictionaries } from "@/lib/i18n/translations";
import { seedQuestions } from "@/lib/store/seedQuestions";
import { QuestionCategory } from "@/lib/types";

const translatedQuestion = {
  text: "English text",
  optionA: "English A",
  optionB: "English B",
  textIt: "Testo italiano",
  optionAIt: "A italiano",
  optionBIt: "B italiano",
};

const untranslatedQuestion = {
  text: "English text",
  optionA: "English A",
  optionB: "English B",
  textIt: null,
  optionAIt: null,
  optionBIt: null,
};

describe("localizeQuestion", () => {
  it("returns English fields for locale 'en' even when Italian text exists", () => {
    expect(localizeQuestion(translatedQuestion, "en")).toEqual({
      text: "English text",
      optionA: "English A",
      optionB: "English B",
    });
  });

  it("returns Italian fields for locale 'it' when present", () => {
    expect(localizeQuestion(translatedQuestion, "it")).toEqual({
      text: "Testo italiano",
      optionA: "A italiano",
      optionB: "B italiano",
    });
  });

  it("falls back to English for locale 'it' when Italian text is missing", () => {
    expect(localizeQuestion(untranslatedQuestion, "it")).toEqual({
      text: "English text",
      optionA: "English A",
      optionB: "English B",
    });
  });
});

describe("categoryTranslationKey", () => {
  it("has an EN and IT dictionary entry for every question category", () => {
    const categories: QuestionCategory[] = [
      "Food",
      "Movies",
      "Sport",
      "Technology",
      "School",
      "Everyday Life",
      "Random",
      "Internet Culture",
    ];
    for (const category of categories) {
      const key = categoryTranslationKey(category);
      expect(dictionaries.en[key]).toBeTruthy();
      expect(dictionaries.it[key]).toBeTruthy();
    }
  });
});

describe("seed question Italian coverage", () => {
  it("every question with any Italian field has all three (no partial translations)", () => {
    for (const q of seedQuestions) {
      const fields = [q.textIt, q.optionAIt, q.optionBIt];
      const anyPresent = fields.some((f) => f != null);
      const allPresent = fields.every((f) => f != null);
      if (anyPresent) {
        expect(allPresent).toBe(true);
      }
    }
  });

  it("has all 352 published questions", () => {
    expect(seedQuestions.length).toBe(352);
  });

  it("has no duplicate question ids", () => {
    const ids = seedQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every published question has complete Italian localization (352/352, no gaps)", () => {
    const missing = seedQuestions.filter((q) => !q.textIt || !q.optionAIt || !q.optionBIt).map((q) => q.id);
    expect(missing).toEqual([]);
  });

  it("English source fields are non-empty and untouched by localization", () => {
    for (const q of seedQuestions) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.optionA.length).toBeGreaterThan(0);
      expect(q.optionB.length).toBeGreaterThan(0);
    }
  });
});
