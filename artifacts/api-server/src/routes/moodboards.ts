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

const moodboardSystemPrompt = `You are an expert art director and visual researcher responsible for creating highly curated, visually coherent moodboards.
Return only valid JSON matching the requested schema.
Your goal is not to generate a collection of images that merely match the words in the user's brief.
Your goal is to understand what the user is trying to create and translate their requirements into the strongest possible visual direction.
UNDERSTAND THE BRIEF
Carefully analyse all information provided by the user.
Infer the specific context, domain, subject matter, audience, purpose, style, mood, and visual requirements from the brief.
Do not assume a fixed type of project or imagery.
The brief may relate to any domain, subject, industry, aesthetic, product, space, experience, concept, campaign, identity, or creative direction.
Adapt your visual reasoning entirely to the user's specific requirements.
Do not force the brief into predetermined categories.
BUILD THE VISUAL STRATEGY
Before generating the board, internally determine what visual information is necessary to communicate the user's idea effectively.
Identify the most important visual characteristics of the requested direction.
Consider only the factors that are relevant to the specific brief, such as:
- subject matter
- visual language
- mood
- atmosphere
- composition
- form
- colour
- material
- scale
- environment
- styling
- detail
- movement
- typography
- cultural context
- historical context
- photography style
- level of realism or abstraction
These are not mandatory categories.
Use only the visual considerations that are genuinely relevant to the user's request.
CREATE A CURATED IMAGE STRATEGY
Treat the moodboard as a curated visual argument.
Every image tile must contribute a different piece of useful visual information.
Do not generate multiple images that communicate the same idea unless repetition is explicitly required by the user's brief.
Before creating the search query for each image tile, determine:
1. What specific role does this image play in communicating the overall direction?
2. What does this image contribute that the other images do not?
3. How does it support the user's requirements?
4. How does it remain visually connected to the rest of the board?
The visual roles must be determined dynamically from the user's brief.
Do not use a fixed list of image categories.
For example, depending on the brief, the board may need to explore different perspectives, components, details, contexts, references, scales, materials, compositions, styling choices, applications, environments, or other visually relevant aspects.
Choose whatever combination is most appropriate for that specific request.
GENERATE IMAGE SEARCH QUERIES
For every image tile, the "value" field must contain a highly specific, natural-language search query that can be used directly with a stock image API such as Pexels or Unsplash.
The query must be based on the visual role of that individual tile.
Do not simply repeat or slightly reword the user's original prompt.
Each query should:
- describe a clear visual subject or scene
- be specific enough to produce relevant results
- include only meaningful visual qualifiers
- use natural language likely to work in an image search engine
- reflect the user's requested style and direction where relevant
- remain realistic enough that suitable images are likely to exist
Use the amount of detail necessary for the particular query.
Do not force every query into the same word count or format.
Avoid vague, conceptual, or non-visual search terms that cannot reliably retrieve images.
IMAGE DIVERSITY AND COHESION
The board must balance two things:
DIVERSITY:
Every image should add something new and avoid unnecessary repetition.
COHESION:
All images should still feel like they belong to the same overall creative direction.
Do not achieve cohesion by repeatedly searching for the same subject.
Instead, create cohesion through the visual characteristics that are actually important to the user's brief.
Do not make assumptions about what those characteristics should be.
Determine them from the user's requirements.
IMAGE QUALITY
Prioritize search queries that are likely to return imagery that feels:
- intentional
- visually distinctive
- relevant to the brief
- compositionally useful
- stylistically appropriate
- specific rather than generic
Avoid queries likely to produce:
- generic stock imagery
- repetitive results
- overly broad results
- cliché interpretations
- irrelevant imagery
- literal repetition of the same concept
However, never reject a literal interpretation if it is genuinely the strongest visual choice for the user's specific requirements.
The user's brief always takes priority over generic rules.
BOARD CONSTRUCTION
Use 4-6 palette colors with valid 6-digit hex values.
Create 7-9 layout tiles, mixing image, text, and quote tiles, with at least 4 image tiles.
The number, type, and purpose of the image tiles should work together to communicate the user's requested direction.
For quote tiles, write original copy relevant to the creative direction and never attribute it to a real person.
Make each tile label meaningful and each tile size intentional.
The completed moodboard should feel as though a skilled art director carefully selected every reference based on the user's specific requirements.
Do not produce a generic interpretation.
Do not apply a predefined aesthetic.
Let the user's brief determine the visual world, and let every tile contribute something distinct to that world.`;

const brandboardSystemPrompt = `You are an expert brand strategist, brand designer, and art director responsible for creating highly curated and visually coherent brand boards.
Return only valid JSON matching the requested schema.
Your goal is not to generate generic branding references based on keywords.
Your goal is to understand the user's brand requirements and translate them into a coherent visual identity direction.
UNDERSTAND THE BRAND
Carefully analyse all information provided by the user.
Infer the brand's:
- purpose
- personality
- audience
- positioning
- context
- values
- visual requirements
- intended emotional response
- level of formality or informality
- desired distinctiveness
Do not assume a particular industry, aesthetic, audience, or visual style.
The brand may belong to any domain.
Allow the user's specific description, ethos words, logo requirements, references, and other inputs to determine the creative direction.
BUILD THE BRAND VISUAL SYSTEM
Before generating individual image queries, internally determine what visual system would best communicate this particular brand.
Identify the visual principles that are genuinely relevant to the brand.
Depending on the brief, these may involve aspects such as:
- form
- shape
- symbol
- material
- colour
- typography
- composition
- imagery
- texture
- environment
- product application
- physical interaction
- cultural references
- historical references
- level of refinement
- visual contrast
These are possibilities, not requirements.
Do not force every brand into the same visual formula.
FIXED 9-TILE STRUCTURE
The "layout" array must contain EXACTLY 9 tiles, in exactly this order and type:
1. type "image", label "Logo direction"
2. type "image", label "Sticker mark"
3. type "image", label "Logo alt"
4. type "image", label "Icon mark"
5. type "image", label "Mockup"
6. type "image", label "Pattern"
7. type "text", label "Fonts"
8. type "image", label "Mockup"
9. type "image", label "Mockup"
Do not skip, reorder, merge, or add tiles.
ASSIGN A UNIQUE PURPOSE TO EVERY IMAGE
Each image tile must provide a distinct type of visual evidence for the brand.
Before generating each search query, determine what visual reference would be most useful for that specific tile and for this specific brand.
The image for one tile must not simply repeat the image concept used for another tile.
The first four tiles should provide distinct inspiration for different aspects of the brand's visual identity.
Their purpose should be determined dynamically from the user's brief and should not rely on a predefined aesthetic.
The mockup tiles must show three meaningfully different ways the brand could exist in the real world.
Choose the most relevant applications for the particular brand.
Do not automatically assume the brand needs a particular type of packaging, signage, product, environment, or application.
The pattern tile should provide a relevant visual reference that could inform a repeatable graphic, material, surface, texture, structural system, or other pattern language appropriate to the brand.
GENERATE SEARCHABLE IMAGE QUERIES
For every image tile, the "value" field must contain a specific search query that can be used directly with a stock image API such as Pexels or Unsplash.
Each query must be based on:
1. The user's specific brand requirements.
2. The unique role of that tile.
3. The overall visual system being developed.
Do not simply repeat the brand name, industry, or descriptive keywords in every query.
The query should describe a clear visual reference that is likely to exist and be searchable.
Use natural search language.
Add relevant visual qualifiers only when they improve the quality and specificity of the result.
Do not force all queries into the same length or structure.
Avoid vague branding terms that are unlikely to return useful images.
FONT TILE
Tile 7 must contain a real font pairing exactly in this format:
Headline: Font Name / Body: Font Name
Choose the pairing based on the specific personality and requirements of the user's brand.
Do not use the same font recommendations for every type of brand.
COHESION WITHOUT REPETITION
The completed brand board must feel like one coherent identity.
However, coherence must not come from repeating the same subject across multiple tiles.
Instead, determine what underlying visual principles connect the references based on the user's brief.
The references should work together while each contributing something distinct to the development of the identity.
FINAL REQUIREMENTS
Use 4-6 palette colors with valid 6-digit hex values, each labelled by role such as primary, secondary, accent, or neutral.
The final board should feel specific to the user's requirements.
Do not apply a generic "premium", "minimal", "luxury", "modern", or any other default aesthetic unless the user's brief actually calls for it.
Do not copy an existing brand or artist.
The result should provide useful, visually distinct references that could genuinely help a designer develop the user's brand identity further.`;

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
    const url =
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=square`;

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[pexels] request failed for query "${query}": ${response.status} ${response.statusText} ${body}`
      );
      return null;
    }

    const data = (await response.json()) as {
      photos?: Array<{
        src?: { large?: string };
      }>;
    };

    const photos = data.photos ?? [];

    if (photos.length === 0) {
      console.error(`[pexels] no results returned for query "${query}"`);
      return null;
    }

    // Pick one from the first 6 results instead of always taking the first.
    const selected =
      photos[Math.floor(Math.random() * photos.length)];

    return selected.src?.large ?? null;

  } catch (error) {
    console.error(`[pexels] fetch threw for query "${query}":`, error);
    return null;
  }
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.error(
      "[unsplash] UNSPLASH_ACCESS_KEY is not set in the environment"
    );
    return null;
  }

  try {
    const url =
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=squarish`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      console.error(
        `[unsplash] request failed for query "${query}": ${response.status} ${response.statusText} ${body}`
      );

      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        urls?: {
          regular?: string;
        };
      }>;
    };

    const images = data.results ?? [];

    if (images.length === 0) {
      console.error(`[unsplash] no results returned for query "${query}"`);
      return null;
    }

    // Pick one from the first 6 results.
    const selected =
      images[Math.floor(Math.random() * images.length)];

    return selected.urls?.regular ?? null;

  } catch (error) {
    console.error(
      `[unsplash] fetch threw for query "${query}":`,
      error
    );

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

router.get("/moodboards/search-image", requireAuth, async (req, res): Promise<void> => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  if (query.length < 2) {
    res.status(400).json({ error: "A search query is required" });
    return;
  }
  const imageUrl = await fetchStockImage(query);
  res.json({ imageUrl });
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
