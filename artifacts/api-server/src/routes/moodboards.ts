import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import OpenAI from "openai";
import {
  GenerateMoodboardBody,
  GenerateMoodboardResponse,
  RefineMoodboardBody,
  RefineMoodboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

const moodboardShape = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    tagline: { type: "string" },
    palette: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          hex: { type: "string" },
          role: { type: "string" },
        },
        required: ["name", "hex", "role"],
        additionalProperties: false,
      },
    },
    keywords: { type: "array", items: { type: "string" } },
    direction: { type: "string" },
    layout: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["image", "text", "color", "quote"] },
          label: { type: "string" },
          value: { type: "string" },
          accent: { type: ["string", "null"] },
          size: { type: "string", enum: ["small", "medium", "large"] },
          imageUrl: { type: ["string", "null"] },
        },
        required: ["type", "label", "value", "accent", "size", "imageUrl"],
        additionalProperties: false,
      },
    },
  },
  required: ["id", "title", "tagline", "palette", "keywords", "direction", "layout"],
  additionalProperties: false,
} as const;

const moodboardSystemPrompt = `You are a senior art director creating an editorial moodboard for a creative person.
Return only valid JSON matching the requested schema. Keep the board specific, evocative, and practical.
Use 4-6 palette colors with valid 6-digit hex values. Create 7-9 layout tiles, mixing image, text, color, and quote, with at least 4 image tiles.
For image tiles, the "value" field must be a short, concrete stock-photo search query (2-4 words) in the style of a well-curated Pinterest board \u2014 aesthetic, lifestyle-oriented, and visually specific (e.g. "aesthetic morning flatlay", "cozy neutral bedroom", "sun-bleached terracotta rooftop", "moody midnight ocean"). Avoid generic or abstract phrasing that a stock photo site would return literally empty-handed for; favor the kind of phrase people actually search when building a mood collection.
For quote tiles, write original copy, never attribute it to a real person.
Make each tile label useful and each size intentional.`;

const brandboardSystemPrompt = `You are a senior brand designer creating a brand board for a creative person's product or business idea.
Return only valid JSON matching the requested schema. Keep the board specific, practical, and on-brand.
Use 4-6 palette colors with valid 6-digit hex values, labeled by role (primary, secondary, accent, neutral, etc).
Create 7-9 layout tiles using mostly text and color tile types: a tile for the brand name/logo concept, a tagline tile, a typography direction tile (describe the type pairing in words), a voice/tone tile, and 2-3 palette/color tiles. You may include at most 1-2 image tiles for texture/mood reference only.
For any image tile, the "value" field must be a short concrete Unsplash search query (2-4 words) for a texture or background reference, not a product mockup.
For quote/text tiles, write original brand copy, never attribute it to a real person.
Make each tile label useful and each size intentional.`;

async function createMoodboard(boardType: "moodboard" | "brandboard", prompt: string): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    max_completion_tokens: 2400,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "moodboard",
        strict: true,
        schema: moodboardShape,
      },
    },
    messages: [
      { role: "system", content: boardType === "brandboard" ? brandboardSystemPrompt : moodboardSystemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty moodboard");
  }

  const parsed = JSON.parse(content) as { layout?: Array<{ type: string; value: string; imageUrl?: string | null }> };
  if (Array.isArray(parsed.layout)) {
    await Promise.all(
      parsed.layout.map(async (tile) => {
        if (tile.type === "image") {
          tile.imageUrl = await fetchStockImage(tile.value);
        }
      }),
    );
  }

  return parsed;
}

async function fetchStockImage(query: string): Promise<string | null> {
  const pexelsResult = await fetchPexelsImage(query);
  if (pexelsResult) return pexelsResult;
  return fetchUnsplashImage(query);
}

async function fetchPexelsImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("[pexels] PEXELS_API_KEY is not set in the environment");
    return null;
  }
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
    const response = await fetch(url, { headers: { Authorization: apiKey } });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[pexels] request failed for query "${query}": ${response.status} ${response.statusText} ${body}`);
      return null;
    }
    const data = (await response.json()) as { photos?: Array<{ src?: { large?: string } }> };
    const photoUrl = data.photos?.[0]?.src?.large ?? null;
    if (!photoUrl) {
      console.error(`[pexels] no results returned for query "${query}"`);
    }
    return photoUrl;
  } catch (error) {
    console.error(`[pexels] fetch threw for query "${query}":`, error);
    return null;
  }
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.error("[unsplash] UNSPLASH_ACCESS_KEY is not set in the environment");
    return null;
  }
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[unsplash] request failed for query "${query}": ${response.status} ${response.statusText} ${body}`);
      return null;
    }
    const data = (await response.json()) as { results?: Array<{ urls?: { regular?: string } }> };
    const photoUrl = data.results?.[0]?.urls?.regular ?? null;
    if (!photoUrl) {
      console.error(`[unsplash] no results returned for query "${query}"`);
    }
    return photoUrl;
  } catch (error) {
    console.error(`[unsplash] fetch threw for query "${query}":`, error);
    return null;
  }
}

router.get("/moodboards/debug/unsplash", async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query : "sunset ocean";
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  const results: Record<string, unknown> = {};

  if (pexelsKey) {
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`, { headers: { Authorization: pexelsKey } });
      const bodyText = await r.text();
      let body: unknown = bodyText;
      try { body = JSON.parse(bodyText); } catch { /* keep raw text */ }
      results.pexels = { ok: r.ok, status: r.status, statusText: r.statusText, keyPrefix: pexelsKey.slice(0, 6), body };
    } catch (error) {
      results.pexels = { ok: false, reason: "fetch threw", error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    results.pexels = { ok: false, reason: "PEXELS_API_KEY is not set in the environment" };
  }

  if (unsplashKey) {
    try {
      const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
      const bodyText = await r.text();
      let body: unknown = bodyText;
      try { body = JSON.parse(bodyText); } catch { /* keep raw text */ }
      results.unsplash = { ok: r.ok, status: r.status, statusText: r.statusText, keyPrefix: unsplashKey.slice(0, 6), body };
    } catch (error) {
      results.unsplash = { ok: false, reason: "fetch threw", error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    results.unsplash = { ok: false, reason: "UNSPLASH_ACCESS_KEY is not set in the environment" };
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
    const { purpose, styles, boardType, layoutStyle, imageCount } = parsed.data;
    const moodboard = await createMoodboard(
      boardType,
      `Create a ${boardType} for this purpose: "${purpose}".
Selected style directions: ${styles.join(", ")}.
Preferred layout composition: ${layoutStyle}.
Include exactly ${imageCount} tiles of type "image", plus a reasonable mix of text, color, and quote tiles around them (aim for ${imageCount + 3}-${imageCount + 5} total tiles).
Give it a memorable title, a concise tagline, a visual direction paragraph, useful keywords, and a tactile ${boardType === "brandboard" ? "brand identity" : "editorial"} composition.`,
    );
    res.json(GenerateMoodboardResponse.parse(moodboard));
  } catch (error) {
    req.log.error({ err: error }, "Moodboard generation failed");
    res.status(500).json({ error: "Moodboard generation failed. Please try again." });
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
    const { purpose, styles, prompt, promptHistory, moodboard, boardType, layoutStyle, imageCount } = parsed.data;
    const refined = await createMoodboard(
      boardType,
      `Refine this existing ${boardType} for "${purpose}" using the selected styles: ${styles.join(", ")}. Preferred layout composition: ${layoutStyle}. Target image tile count: ${imageCount}.
The user's requested change is: "${prompt}".
This change must be clearly visible in the result: update the specific tiles it affects (their label, value, and/or accent color), and reflect it in the direction paragraph and keywords too. Do not return a board that is nearly identical to the input \u2014 a refinement with no noticeable difference is a failure.
Previous refinement requests, in order: ${promptHistory?.length ? promptHistory.map((item, index) => `${index + 1}. ${item}`).join(" | ") : "none yet"}.
Keep tiles that are unrelated to this request as they are, but change what the request asks for.
Existing moodboard JSON:
${JSON.stringify(moodboard)}`,
    );
    res.json(RefineMoodboardResponse.parse(refined));
  } catch (error) {
    req.log.error({ err: error }, "Moodboard refinement failed");
    res.status(500).json({ error: "Moodboard refinement failed. Please try again." });
  }
});

export default router;