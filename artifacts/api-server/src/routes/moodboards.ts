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

const brandboardSystemPrompt = `You are a senior brand designer creating a brand identity board for a creative person's product or business idea.
Return only valid JSON matching the requested schema. Use 4-6 palette colors with valid 6-digit hex values, each labeled by role (primary, secondary, accent, neutral, etc).
The "layout" array must contain EXACTLY 9 tiles, in exactly this order and type, representing a fixed template \u2014 do not skip, reorder, merge, or add tiles:
1. type "image", label "Logo direction" \u2014 value is a short stock-photo search query (2-4 words) for a real, photographable subject that evokes the logo's visual mood (e.g. "hand carved wood stamp", "vintage brass emblem") \u2014 not an abstract phrase like "modern emblem concept" that a photo site won't have literal results for.
2. type "image", label "Sticker mark" \u2014 value is a search query for a real photographable object with a sticker/badge/label look (e.g. "vintage travel sticker", "enamel pin badge").
3. type "image", label "Logo alt" \u2014 value is a search query for a different real photographable object in the same visual mood as tile 1.
4. type "image", label "Icon mark" \u2014 value is a search query for a simple, real, photographable object or symbol (e.g. "brass compass", "minimalist ceramic vase") \u2014 something a stock photo actually exists of, not an abstract "icon design" phrase.
5. type "image", label "Mockup" \u2014 value is a search query for a realistic product or packaging mockup photo reflecting the brand.
6. type "image", label "Pattern" \u2014 value is a search query for a seamless pattern or texture reference matching the brand aesthetic.
7. type "text", label "Fonts" \u2014 value names a specific font pairing (real typeface names, e.g. "Headline: Fraunces Bold / Body: Inter") that fits the brand ethos, in one short sentence.
8. type "image", label "Mockup" \u2014 another product/packaging mockup search query, a different item or angle than tile 5.
9. type "image", label "Mockup" \u2014 a third distinct product/packaging mockup search query.
For every image tile, the "value" field must be a short, concrete stock-photo search query (2-4 words) in the style of a well-curated Pinterest brand board \u2014 specific and realistically searchable, not poetic.
Let the brand's ethos words steer every tile's tone and the overall palette. Do not use "quote" or "color" type tiles in this board \u2014 only "image" and "text" as specified above.
If a logo description and/or reference image is provided, let it directly inform tiles 1-4 and the palette/direction \u2014 do not describe or reproduce the reference literally, just let it guide the aesthetic.`;

async function createMoodboard(boardType: "moodboard" | "brandboard", prompt: string, logoImageDataUrl?: string): Promise<unknown> {
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
  if (boardType === "brandboard" && logoImageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: logoImageDataUrl } });
  }

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
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty moodboard");
  }

  const parsed = JSON.parse(content) as { layout?: Array<{ type: string; label: string; value: string; accent?: string | null; size?: string; imageUrl?: string | null }> };
  if (Array.isArray(parsed.layout)) {
    if (boardType === "brandboard") {
      if (parsed.layout.length > 9) {
        parsed.layout = parsed.layout.slice(0, 9);
      } else if (parsed.layout.length < 9) {
        const fallbackLabels = ["Logo direction", "Sticker mark", "Logo alt", "Icon mark", "Mockup", "Pattern", "Fonts", "Mockup", "Mockup"];
        while (parsed.layout.length < 9) {
          const index = parsed.layout.length;
          parsed.layout.push({
            type: fallbackLabels[index] === "Fonts" ? "text" : "image",
            label: fallbackLabels[index] ?? "Mockup",
            value: fallbackLabels[index] === "Fonts" ? "Headline: Fraunces / Body: Inter" : "brand aesthetic reference",
            accent: null,
            size: "medium",
          });
        }
      }
    }
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

const GENERIC_FALLBACK_QUERIES = ["minimal aesthetic texture", "neutral abstract background", "soft studio texture"];

async function fetchStockImage(query: string, attempt = 0): Promise<string | null> {
  const pexelsResult = await fetchPexelsImage(query);
  if (pexelsResult) return pexelsResult;
  const unsplashResult = await fetchUnsplashImage(query);
  if (unsplashResult) return unsplashResult;

  // Both sources came back empty for this query. Retry with a broader/simpler
  // version before giving up, since abstract queries (e.g. "icon mark concept")
  // often return nothing where a shorter or more generic phrase will.
  const words = query.trim().split(/\s+/);
  if (words.length > 2) {
    const shorter = words.slice(0, 2).join(" ");
    console.error(`[stock-image] no results for "${query}", retrying with shorter query "${shorter}"`);
    return fetchStockImage(shorter, attempt + 1);
  }

  if (attempt < GENERIC_FALLBACK_QUERIES.length) {
    const fallback = GENERIC_FALLBACK_QUERIES[attempt];
    console.error(`[stock-image] no results for "${query}", falling back to generic query "${fallback}"`);
    return fetchStockImage(fallback, attempt + 1);
  }

  console.error(`[stock-image] exhausted all fallbacks for original query, giving up`);
  return null;
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
    const { purpose, styles, boardType, layoutStyle, imageCount, logoDescription, logoImageDataUrl } = parsed.data;
    const promptText =
      boardType === "brandboard"
        ? `Create a brand identity board for this brand: "${purpose}".
Brand ethos words: ${styles.join(", ")}.
Logo description provided by the user: ${logoDescription?.trim() ? `"${logoDescription.trim()}"` : "none provided"}.
${logoImageDataUrl ? "A reference logo image is attached \u2014 let it inform the visual direction." : "No reference logo image was attached."}
Give it a memorable brand name/title, a concise tagline, a visual direction paragraph, and useful keywords.`
        : `Create a moodboard for this purpose: "${purpose}".
Selected style directions: ${styles.join(", ")}.
Preferred layout composition: ${layoutStyle}.
Include exactly ${imageCount} tiles of type "image", plus a reasonable mix of text, color, and quote tiles around them (aim for ${imageCount + 3}-${imageCount + 5} total tiles).
Give it a memorable title, a concise tagline, a visual direction paragraph, and useful keywords.`;
    const moodboard = await createMoodboard(boardType, promptText, boardType === "brandboard" ? logoImageDataUrl : undefined);
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