import crypto from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { GenerateMoodboardBody, GenerateMoodboardResponse, RefineMoodboardBody, RefineMoodboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const styleKeywords: Record<string, string[]> = {
  "quiet luxury": ["neutral tones", "marble texture", "soft daylight", "minimal interior", "cashmere", "still life", "muted palette", "linen fabric"],
  "raw & tactile": ["concrete texture", "natural light", "linen", "clay", "rough surface", "handmade", "unfinished wood", "grain texture"],
  "cinematic": ["dramatic lighting", "film still", "moody shadows", "backlit", "wide shot", "golden hour", "film grain", "silhouette"],
  "sun-washed": ["warm light", "faded film", "desert tones", "golden hour", "sun flare", "bleached color", "summer haze", "dusty light"],
  "editorial": ["fashion editorial", "studio portrait", "bold pose", "clean composition", "high contrast", "magazine style", "graphic shadow"],
  "strange & tender": ["surreal", "soft grain", "intimate", "quiet moment", "dreamlike", "vulnerable", "unusual angle", "soft focus"],
};

function generateSearchQueries(selectedTags: string[], count: number): string[] {
  const pool = selectedTags.flatMap((tag) => styleKeywords[tag] ?? []);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const queries: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = shuffled[i % shuffled.length];
    const b = shuffled[(i + 1) % shuffled.length];
    queries.push(a === b ? a : `${a} ${b}`);
  }
  return queries;
}

const layoutTemplates: Record<string, (imageCount: number) => Array<"small" | "medium" | "large">> = {
  "clean grid": (n) => Array(n).fill("medium"),
  "asymmetric collage": (n) => Array.from({ length: n }, (_, i) => (i === 0 ? "large" : i % 3 === 0 ? "medium" : "small")),
  "scrapbook stack": (n) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? "small" : "medium")),
};

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type GeminiBoardOutput = {
  queries: string[];
  palette: Array<{ name: string; hex: string; role: string }>;
};

async function generateQueriesAndPalette(purpose: string, styles: string[], imageCount: number): Promise<GeminiBoardOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  const fallback: GeminiBoardOutput = {
    queries: generateSearchQueries(styles, imageCount),
    palette: [
      { name: "Ivory", hex: "#F2ECE4", role: "background" },
      { name: "Charcoal", hex: "#2E2A26", role: "primary" },
      { name: "Clay", hex: "#B08968", role: "accent" },
      { name: "Sand", hex: "#DCC7A1", role: "highlight" },
    ],
  };

  if (!apiKey) {
    console.warn("[gemini] GEMINI_API_KEY is not set");
    return fallback;
  }

  const prompt = `You are helping build a visual moodboard.
Brief: "${purpose}"
Selected style tags: ${styles.join(", ")}

Return ONLY valid JSON, no markdown, matching exactly this shape:
{
  "queries": string[], // ${imageCount} distinct, specific stock-photo search phrases (2-5 words each) that together visually cover the brief and style tags. Do not repeat the brief verbatim. Make them concrete and searchable.
  "palette": [{ "name": string, "hex": string, "role": "background"|"primary"|"accent"|"highlight" }] // 4-6 colors, valid 6-digit hex, that fit the brief and style tags
}`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[gemini] request failed: ${response.status} ${response.statusText}`, await response.text());
      return fallback;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text) as GeminiBoardOutput;

    if (!Array.isArray(parsed.queries) || !Array.isArray(parsed.palette)) {
      return fallback;
    }

    return parsed;
  } catch (error) {
    console.error("[gemini] failed:", error);
    return fallback;
  }
}

type GeminiBrandOutput = {
  queries: string[];
  palette: Array<{ name: string; hex: string; role: string }>;
  fonts: string;
};

async function generateBrandContent(purpose: string, styles: string[], logoDescription?: string): Promise<GeminiBrandOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  const fallback: GeminiBrandOutput = {
    queries: generateSearchQueries(styles, 8),
    palette: [
      { name: "Ivory", hex: "#F2ECE4", role: "background" },
      { name: "Charcoal", hex: "#2E2A26", role: "primary" },
      { name: "Clay", hex: "#B08968", role: "accent" },
      { name: "Sand", hex: "#DCC7A1", role: "highlight" },
    ],
    fonts: "Headline: Fraunces / Body: Inter",
  };

  if (!apiKey) {
    console.warn("[gemini] GEMINI_API_KEY is not set");
    return fallback;
  }

  const prompt = `You are helping build a brand identity board.
Brand description: "${purpose}"
Selected style tags: ${styles.join(", ")}
${logoDescription?.trim() ? `Logo notes: "${logoDescription.trim()}"` : ""}

Return ONLY valid JSON, no markdown, matching exactly this shape:
{
  "queries": string[], // 8 distinct, specific stock-photo search phrases (2-5 words each) covering: logo direction, sticker mark, logo alt, icon mark, mockup, pattern, mockup, mockup — in that order, each visually different
  "palette": [{ "name": string, "hex": string, "role": "background"|"primary"|"accent"|"highlight" }], // 4-6 colors, valid 6-digit hex
  "fonts": string // a real font pairing that fits the brand's vibe, exactly in the format "Headline: FontName / Body: FontName", using fonts genuinely available on Google Fonts or Adobe Fonts
}`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[gemini] request failed: ${response.status} ${response.statusText}`, await response.text());
      return fallback;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text) as GeminiBrandOutput;

    if (!Array.isArray(parsed.queries) || !Array.isArray(parsed.palette) || typeof parsed.fonts !== "string") {
      return fallback;
    }

    return parsed;
  } catch (error) {
    console.error("[gemini] failed:", error);
    return fallback;
  }
}

type ImageCandidate = {
  id: string;
  url: string;
  source: "cosmos" | "pexels";
};

/**
 * Races a promise against a hard deadline. If the deadline wins, `fallback`
 * is returned instead of letting one slow tile eat the whole request's time
 * budget.
 */
function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function buildMoodboardContent(purpose: string, styles: string[], layoutStyle: string, imageCount: number) {
  const { queries, palette } = await generateQueriesAndPalette(purpose, styles, imageCount);
  const sizes = (layoutTemplates[layoutStyle] ?? layoutTemplates["clean grid"])(imageCount);

  const layout = queries.map((q, i) => ({
    type: "image" as const,
    label: `Reference ${i + 1}`,
    value: q,
    accent: null,
    size: sizes[i],
    imageUrl: null as string | null,
  }));

  return {
    id: crypto.randomUUID(),
    title: purpose.split(" ").slice(0, 4).join(" "),
    tagline: styles.join(" · "),
    palette,
    keywords: styles,
    direction: `A board built around ${styles.join(", ")}, shaped by: "${purpose}".`,
    layout,
  };
}

async function buildBrandboardContent(purpose: string, styles: string[], logoDescription?: string) {
  const { queries, palette, fonts } = await generateBrandContent(purpose, styles, logoDescription);
  const labels = ["Logo direction", "Sticker mark", "Logo alt", "Icon mark", "Mockup", "Pattern", "Fonts", "Mockup", "Mockup"];

  let qi = 0;
  const layout = labels.map((label) => {
    if (label === "Fonts") {
      return { type: "text" as const, label, value: fonts, accent: null, size: "medium" as const, imageUrl: null };
    }
    return { type: "image" as const, label, value: queries[qi++], accent: null, size: "medium" as const, imageUrl: null };
  });

  return {
    id: crypto.randomUUID(),
    title: purpose.split(" ").slice(0, 4).join(" "),
    tagline: styles.join(" · "),
    palette,
    keywords: styles,
    direction: `Identity system for: "${purpose}"${logoDescription ? `, informed by logo notes: "${logoDescription}"` : ""}.`,
    layout,
  };
}

async function createMoodboard(boardType: "moodboard" | "brandboard", purpose: string, styles: string[], layoutStyle: string, imageCount: number, logoDescription?: string): Promise<unknown> {
  const content = boardType === "brandboard"
    ? await buildBrandboardContent(purpose, styles, logoDescription)
    : await buildMoodboardContent(purpose, styles, layoutStyle, imageCount);

  await Promise.all(content.layout.map(async (tile) => {
    if (tile.type === "image") {
      try {
        tile.imageUrl = await withDeadline(fetchStockImage(tile.value), 15000, null);
      } catch (error) {
        console.error(`[stock-image] failed for tile "${tile.label}":`, error);
        tile.imageUrl = null;
      }
    }
  }));

  return content;
}

function selectBestImage(candidates: ImageCandidate[]): string | null {
  if (candidates.length === 0) return null;
  const topN = candidates.slice(0, Math.min(4, candidates.length));
  return topN[Math.floor(Math.random() * topN.length)].url;
}

async function fetchStockImage(query: string): Promise<string | null> {
  const cosmosCandidates = await fetchCosmosImages(query);
  const pexelsCandidates = cosmosCandidates.length === 0 ? await fetchPexelsImages(query) : [];
  const candidates = [...cosmosCandidates, ...pexelsCandidates];

  if (candidates.length === 0) {
    console.error(`[stock-image] no candidates for "${query}"`);
    return null;
  }

  return selectBestImage(candidates);
}

const COSMOS_SEARCH_ELEMENTS_URL = "https://api.parse.bot/scraper/518f0113-a227-49a8-95cf-31124444fa1e/search_elements";
const COSMOS_MAX_CANDIDATES = 10;
const EXTERNAL_FETCH_TIMEOUT_MS = 6000;

async function fetchCosmosImages(query: string): Promise<ImageCandidate[]> {
  const apiKey = process.env.PARSE_API_KEY;

  if (!apiKey) {
    console.warn("[cosmos] PARSE_API_KEY is not set");
    return [];
  }

  try {
    const response = await fetch(COSMOS_SEARCH_ELEMENTS_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        order: "RELEVANT",
        content_type: "IMAGE",
      }),
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[cosmos] request failed: ${response.status} ${response.statusText}`, body);
      return [];
    }

    const data = (await response.json()) as {
      data?: {
        items?: Array<{
          id: number | string;
          type?: string;
          media?: {
            url?: string;
            __typename?: string;
            notSafeForWorkStatus?: string;
          };
        }>;
      };
      status?: string;
    };

    const items = data.data?.items ?? [];

    return items
      .filter((item) => item.media?.notSafeForWorkStatus !== "EXPLICIT")
      .slice(0, COSMOS_MAX_CANDIDATES)
      .map((item) => ({
        id: `cosmos-${item.id}`,
        url: item.media?.url ?? "",
        source: "cosmos" as const,
      }))
      .filter((image) => image.url);
  } catch (error) {
    console.error("[cosmos] fetch failed:", error);
    return [];
  }
}

async function fetchPexelsImages(query: string): Promise<ImageCandidate[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn("[pexels] PEXELS_API_KEY is not set");
    return [];
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${COSMOS_MAX_CANDIDATES}&orientation=square`;

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[pexels] request failed: ${response.status} ${response.statusText}`, body);
      return [];
    }

    const data = (await response.json()) as {
      photos?: Array<{
        id: number;
        src?: {
          medium?: string;
          large?: string;
        };
      }>;
    };

    return (data.photos ?? [])
      .map((photo) => ({
        id: `pexels-${photo.id}`,
        url: photo.src?.medium ?? photo.src?.large ?? "",
        source: "pexels" as const,
      }))
      .filter((image) => image.url);
  } catch (error) {
    console.error("[pexels] fetch failed:", error);
    return [];
  }
}

router.get("/moodboards/debug/unsplash", async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query : "sunset ocean";
  const pexelsKey = process.env.PEXELS_API_KEY;
  const parseKey = process.env.PARSE_API_KEY;

  const results: Record<string, unknown> = {};

  if (pexelsKey) {
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`, { headers: { Authorization: pexelsKey } });
      const bodyText = await r.text();
      let body: unknown = bodyText;

      try {
        body = JSON.parse(bodyText);
      } catch {
        // Keep raw text.
      }

      results.pexels = {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        keyPrefix: pexelsKey.slice(0, 6),
        body,
      };
    } catch (error) {
      results.pexels = {
        ok: false,
        reason: "fetch threw",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    results.pexels = {
      ok: false,
      reason: "PEXELS_API_KEY is not set in the environment",
    };
  }

  if (parseKey) {
    try {
      const r = await fetch(COSMOS_SEARCH_ELEMENTS_URL, {
        method: "POST",
        headers: {
          "X-API-Key": parseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, order: "RELEVANT", content_type: "IMAGE" }),
      });
      const bodyText = await r.text();
      let body: unknown = bodyText;

      try {
        body = JSON.parse(bodyText);
      } catch {
        // Keep raw text.
      }

      results.cosmos = {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        keyPrefix: parseKey.slice(0, 6),
        body,
      };
    } catch (error) {
      results.cosmos = {
        ok: false,
        reason: "fetch threw",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    results.cosmos = {
      ok: false,
      reason: "PARSE_API_KEY is not set in the environment",
    };
  }

  res.json(results);
});

router.post("/moodboards/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateMoodboardBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid moodboard brief");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { purpose, styles, boardType, layoutStyle, imageCount, logoDescription } = parsed.data;

    const moodboard = await createMoodboard(
      boardType,
      purpose,
      styles,
      layoutStyle,
      imageCount,
      boardType === "brandboard" ? logoDescription : undefined,
    );

    res.json(GenerateMoodboardResponse.parse(moodboard));
  } catch (error) {
    req.log.error({ err: error }, "Moodboard generation failed");
    console.error("[moodboards/generate] full error:", error);

    res.status(500).json({
      error: error instanceof Error ? error.message : "Moodboard generation failed. Please try again.",
    });
  }
});

router.get("/moodboards/search-image", requireAuth, async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

  if (query.length < 2) {
    res.status(400).json({ error: "A search query is required" });
    return;
  }

  try {
    const imageUrl = await fetchStockImage(query);
    res.json({ imageUrl });
  } catch (error) {
    console.error("[moodboards/search-image] failed:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Image search failed",
    });
  }
});

router.get("/moodboards/search-images", requireAuth, async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

  if (query.length < 2) {
    res.status(400).json({ error: "A search query is required" });
    return;
  }

  try {
    const cosmosCandidates = await fetchCosmosImages(query);
    const pexelsCandidates = cosmosCandidates.length === 0 ? await fetchPexelsImages(query) : [];
    const candidates = [...cosmosCandidates, ...pexelsCandidates];

    res.json({
      results: candidates.map((c) => ({ url: c.url, source: c.source })),
    });
  } catch (error) {
    console.error("[moodboards/search-images] failed:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Image search failed",
    });
  }
});

router.post("/moodboards/refine", requireAuth, async (req, res): Promise<void> => {
  const parsed = RefineMoodboardBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid moodboard refinement");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // NOTE: this makes the route compile and run, but `prompt` and
    // `promptHistory` (the user's actual refinement request) are currently
    // ignored — this just regenerates a fresh board from the same inputs.
    // Still need to decide: drop refine, one thin Gemini call to steer it,
    // or fixed refine actions (swap tile / new palette / etc).
    const { purpose, styles, boardType, layoutStyle, imageCount } = parsed.data;

    const refined = await createMoodboard(boardType, purpose, styles, layoutStyle, imageCount);

    res.json(RefineMoodboardResponse.parse(refined));
  } catch (error) {
    req.log.error({ err: error }, "Moodboard refinement failed");
    console.error("[moodboards/refine] full error:", error);

    res.status(500).json({
      error: error instanceof Error ? error.message : "Moodboard refinement failed. Please try again.",
    });
  }
});

export default router;
