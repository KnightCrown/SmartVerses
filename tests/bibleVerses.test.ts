import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BUILTIN_KJV_ID, getTranslationById } from "../src/services/bibleLibraryService";
import {
  detectAndLookupReferences,
  resetParseContext,
} from "../src/services/smartVersesBibleService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kjvPath = path.resolve(
  __dirname,
  "../public/data/bibles/kjv.svjson"
);

const createFetchMock = (payload: unknown) => {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/data/bibles/kjv.svjson")) {
      return {
        ok: true,
        json: async () => payload,
      } as Response;
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response;
  };
};

describe("Bible verse loading", () => {
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    const raw = await readFile(kjvPath, "utf8");
    const payload = JSON.parse(raw);
    globalThis.fetch = createFetchMock(payload);
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    resetParseContext();
  });

  it("loads one verse per book and at least 10 verses each", async () => {
    const translation = await getTranslationById(BUILTIN_KJV_ID);
    expect(translation).toBeTruthy();

    const books = translation?.books ?? {};
    const failures: Array<{ book: string; ref: string; expected: number; got: number }> = [];
    for (const [bookName, chapters] of Object.entries(books)) {
      const chapterNumbers = Object.keys(chapters)
        .map((key) => parseInt(key, 10))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      expect(chapterNumbers.length).toBeGreaterThan(0);

      const firstChapter = String(chapterNumbers[0]);
      const verses = (chapters as Record<string, Record<string, unknown>>)[firstChapter];
      const verseNumbers = Object.keys(verses)
        .map((key) => parseInt(key, 10))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      expect(verseNumbers.length).toBeGreaterThan(0);

      const maxVerse = verseNumbers[verseNumbers.length - 1];
      const targetCount = Math.min(10, maxVerse);
      const ref = `${bookName} ${firstChapter}:1-${targetCount}`;
      const results = await detectAndLookupReferences(ref, {
        translationId: BUILTIN_KJV_ID,
      });
      if (results.length < targetCount) {
        failures.push({
          book: bookName,
          ref,
          expected: targetCount,
          got: results.length,
        });
      }
    }
    expect(failures).toEqual([]);
  });

  it("loads Psalms 23:1 via search pipeline", async () => {
    const results = await detectAndLookupReferences("psalms 23:1", {
      translationId: BUILTIN_KJV_ID,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].verseText).toBeTruthy();
  });

  it("does not infer context from ordinary numbered speech", async () => {
    await detectAndLookupReferences("2 Timothy 4:7", {
      translationId: BUILTIN_KJV_ID,
    });

    const results = await detectAndLookupReferences("Three things to note.", {
      translationId: BUILTIN_KJV_ID,
    });
    expect(results).toEqual([]);
  });

  it("does not map noisy chapter/verse sentences to previous context", async () => {
    await detectAndLookupReferences("1 Corinthians 16:13", {
      translationId: BUILTIN_KJV_ID,
    });

    const results = await detectAndLookupReferences(
      "Abaco, chapter two, verse four, he said.",
      {
        translationId: BUILTIN_KJV_ID,
      }
    );
    expect(results).toEqual([]);
  });

  it("still supports explicit context continuation like 'verse 20'", async () => {
    await detectAndLookupReferences("Romans 4:17", {
      translationId: BUILTIN_KJV_ID,
    });

    const results = await detectAndLookupReferences("verse 20", {
      translationId: BUILTIN_KJV_ID,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].displayRef).toBe("Romans 4:20");
  });

  it("supports contextual chapter + verse phrases in transcript fragments", async () => {
    await detectAndLookupReferences("Acts 5:1", {
      translationId: BUILTIN_KJV_ID,
    });

    const results = await detectAndLookupReferences(
      "Chapter 2 and verse 6. Now, when this was noised abroad,",
      {
        translationId: BUILTIN_KJV_ID,
      }
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].displayRef).toBe("Acts 2:6");
  });
});
