import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import OpenAI from "openai";
import { GenerateMoodboardBody, GenerateMoodboardResponse, RefineMoodboardBody, RefineMoodboardResponse } from "@workspace/api-zod";

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

const moodboardSystemPrompt = `You are an expert art director and visual researcher creating a highly curated moodboard.
Return only valid JSON matching the required schema.
Your task is to transform the COMPLETE user brief into a cohesive visual direction.
The user provides their requirements through multiple parts of a creative quiz. These inputs are not separate or optional instructions. They must be understood together as one complete creative brief.
The complete brief may include:
- a description of what the user wants to create
- the requested number of image tiles
- the selected layout or composition
- selected visual instincts, style directions, or vibe
Every relevant part of the brief must influence the final board.
FULL BRIEF ANALYSIS — REQUIRED
Before generating any title, palette, tile, or image query, analyse the ENTIRE user brief.
Do not reduce the user's description to one or two keywords.
Do not focus only on the main noun or most obvious subject.
Identify all visually relevant requirements, relationships, characteristics, details, constraints, and priorities contained across the complete brief.
Treat the user's inputs as a set of connected requirements.
The description explains WHAT is being created or explored.
The selected vibe and visual directions explain HOW it should feel and be visually expressed.
The layout explains HOW the visual information should be organised.
The requested image count determines HOW MUCH distinct visual information the board should contain.
These inputs must work together.
If the user provides a detailed description containing multiple requirements, the final tiles must collectively reflect those requirements rather than repeatedly representing only the most obvious concept.
Do not ignore secondary details when they are visually relevant.
VISUAL REASONING
First determine the specific visual strategy required for this particular brief.
Do not assume a fixed domain, aesthetic, subject matter, industry, or type of imagery.
The user's request may relate to any kind of concept or creative direction.
Adapt your reasoning entirely to the user's requirements.
Determine which visual characteristics are genuinely important for communicating the brief.
These may include any relevant aspects such as subject matter, form, composition, atmosphere, styling, context, colour, scale, material, movement, environment, detail, typography, cultural references.
Do not use a fixed formula.
Only use visual considerations that are genuinely relevant to the user's specific brief.
TILE STRATEGY
Treat the board as a carefully curated visual system.
Before generating each image tile, internally determine:
1. What part of the complete brief should this tile help communicate?
2. What visual role should this tile play?
3. What information does this tile contribute that the other tiles do not?
4. How does it connect to the overall visual direction?
The visual role of every tile must be decided dynamically from the user's requirements.
Do not use predetermined image categories.
Do not repeatedly generate variations of the same subject unless repetition is specifically required by the user's brief.
The image tiles must collectively cover the complete visual direction while remaining cohesive.
SEARCH QUERY GENERATION
For every image tile, the "value" field must contain a precise search query that can realistically be used with a stock image API.
The query must be based on:
- the complete user brief
- the specific purpose of that individual tile
- the selected visual direction
- the need for diversity across the board
Do not simply repeat or slightly rewrite the user's original description.
Each query should describe a clear visual subject, scene, reference, or composition that is likely to exist in an image library.
Use natural search language.
Include visual details only when they improve relevance and help retrieve stronger results.
Avoid queries that are unnecessarily broad, vague, repetitive, or dependent on abstract words that cannot be visually searched.
Do not force all queries into the same length or structure.
IMAGE DIVERSITY AND COHESION
Every image should contribute something distinct.
However, the board must still feel visually connected.
Create cohesion based on the characteristics that are actually important to the user's brief.
Do not create cohesion simply by searching for the same subject repeatedly.
Avoid generic, cliché, repetitive, irrelevant, or weak visual interpretations when a more specific and useful visual reference can better communicate the user's requirements.
The user's requirements always take priority over generic aesthetic rules.
BOARD CONSTRUCTION
Use 4-6 palette colors with valid 6-digit hex values.
Follow the requested image tile count exactly.
Create an appropriate mix of image, text, color, and quote tiles around the requested image tiles.
Respect the user's selected layout when determining the hierarchy, size, emphasis, and organisation of the tiles.
For quote tiles, write original copy relevant to the complete creative direction and never attribute it to a real person.
Make every tile label meaningful.
The final moodboard should feel intentionally curated, visually intelligent, specific to the user's requirements, and composed as one complete visual direction.
Do not produce a generic interpretation.
Do not apply a default aesthetic.
Let the complete user brief determine what the board should become.`;

const brandboardSystemPrompt = `You are an expert brand strategist, brand designer, and art director creating a highly curated brand identity board.
Return only valid JSON matching the required schema.
Your task is to transform the COMPLETE user brief into a coherent visual identity direction.
The user provides the brand requirements through multiple parts of a creative quiz.
These inputs may include:
- a description of the brand
- an optional reference logo image
- an optional logo description
- the brand's core principles, ethos, values, or what it represents
- selected visual directions or vibe
All relevant inputs must be considered together as one complete brand brief.
FULL BRAND BRIEF ANALYSIS — REQUIRED
Before generating the board, analyse the ENTIRE brand brief.
Do not reduce the brand to its industry, name, main product, or one or two descriptive keywords.
Identify all relevant requirements contained across the complete input.
Understand how the different inputs relate to one another.
The brand description explains WHAT the brand is.
The core principles and ethos explain WHAT the brand represents and how it should be perceived.
The logo description and reference logo, when provided, contribute to the visual identity and should inform the direction.
The selected vibe explains HOW the brand board should visually feel.
All relevant inputs must influence the final direction.
Do not allow one input to completely override the others unless there is a clear conflict.
If a reference logo image is attached, analyse its visible characteristics and use it as visual guidance where relevant.
Do not reproduce or copy the logo.
Do not ignore the written brief simply because a logo image is provided.
BRAND VISUAL STRATEGY
Before generating individual tiles, determine what visual system best represents this specific brand.
Do not assume a fixed industry, audience, aesthetic, product type, or visual formula.
Allow the user's complete brief to determine the identity direction.
Determine which visual principles are genuinely relevant to this brand.
These may involve any relevant aspects such as form, shape, proportion, colour, material, typography, imagery, composition, texture, context, application, interaction, cultural references, history.
Do not force every brand into the same identity structure.
FIXED 9-TILE STRUCTURE
The "layout" array must contain EXACTLY 9 tiles in exactly this order and type:
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
UNIQUE VISUAL PURPOSE
Each image tile must contribute a different and useful piece of visual information.
Before generating the query for each tile, determine what that tile should contribute to the identity system.
The first four visual references must not be repetitive variations of the same idea.
They should collectively provide useful inspiration for different aspects of the brand identity.
The three mockup tiles must show three meaningfully different and relevant ways the brand could exist in the real world.
Choose the applications dynamically based on the user's brand.
Do not automatically assume a particular type of packaging, product, signage, environment, or physical application.
The pattern tile should provide a visual reference appropriate to the brand that could inform a repeatable visual language.
FONT TILE
Tile 7 must contain a real font pairing exactly in this format:
Headline: Font Name / Body: Font Name
Choose the pairing based on the complete brand brief.
SEARCH QUERY GENERATION
For every image tile, the "value" field must contain a specific search query that can realistically be used with a stock image API.
Each query must be based on:
- the complete brand description
- the logo information when relevant
- the core principles and ethos
- the selected vibe
- the specific purpose of that tile
- the need for diversity across the complete board
Do not repeatedly use the brand name, industry, or the same descriptive keywords.
Do not create generic branding searches.
Each query should describe a clear visual reference that is likely to exist and be searchable.
Use natural search language.
Include relevant visual details when they improve the quality and relevance of the search.
COHESION AND DIVERSITY
The final board must feel like one coherent identity system.
However, coherence must not come from repeating the same subject, object, application, or visual idea.
Every tile should contribute something new while remaining connected to the overall brand direction.
Determine what creates that connection from the user's actual brief.
FINAL REQUIREMENTS
Use 4-6 palette colors with valid 6-digit hex values, each labelled by role.
Do not apply a generic premium, luxury, minimal, modern, playful, or any other default aesthetic unless the user's brief specifically calls for it.
Do not copy an existing brand or artist.
The final board should feel specific to the user's requirements and provide visually useful references that could genuinely help develop the identity further.`;

type ImageCandidate = {
  id: string;
  url: string;
  source: "pexels" | "unsplash";
};

async function createMoodboard(boardType: "moodboard" | "brandboard", prompt: string, logoImageDataUrl?: string): Promise<unknown> {
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];

  if (boardType === "brandboard" && logoImageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: logoImageDataUrl } });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
            imageUrl: null,
          });
        }
      }
    }

    await Promise.all(parsed.layout.map(async (tile) => {
      if (tile.type === "image") {
        try {
          tile.imageUrl = await fetchStockImage(tile.value, prompt);
        } catch (error) {
          console.error(`[stock-image] failed for tile "${tile.label}":`, error);
          tile.imageUrl = null;
        }
      }
    }));
  }

  return parsed;
}

const GENERIC_FALLBACK_QUERIES = ["minimal aesthetic texture", "neutral abstract background", "soft studio texture"];

async function selectBestImage(candidates: ImageCandidate[], tileQuery: string, completeBrief: string): Promise<string | null> {
  if (candidates.length === 0) return null;

  if (candidates.length === 1) {
    return candidates[0].url;
  }

  const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `
You are selecting the strongest image for a curated visual board.

COMPLETE CREATIVE BRIEF:
${completeBrief}

THIS TILE'S VISUAL PURPOSE / SEARCH QUERY:
${tileQuery}

You will receive ${candidates.length} candidate images.

Compare them visually.

Select the ONE image that best satisfies the complete brief and the specific purpose of this tile.

Prioritize:

- relevance to the complete brief
- relevance to this specific tile
- visual quality
- composition
- stylistic fit
- strength of visual communication
- usefulness within a curated board

Reject images that are:

- generic
- weakly related
- visually poor
- misleading
- cliché
- badly composed
- too literal when a stronger interpretation exists
- inconsistent with the selected direction

Return ONLY the number of the best candidate.

Candidates are numbered starting from 1.
`,
    },
    ...candidates.map((candidate, index) => ({ type: "text" as const, text: `Candidate ${index + 1}` })),
    ...candidates.map((candidate) => ({ type: "image_url" as const, image_url: { url: candidate.url } })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 20,
      messages: [{ role: "user", content: imageContent }],
    });

    const answer = response.choices[0]?.message?.content?.trim() ?? "";
    const selectedNumber = Number(answer.match(/\d+/)?.[0]);

    if (Number.isInteger(selectedNumber) && selectedNumber >= 1 && selectedNumber <= candidates.length) {
      return candidates[selectedNumber - 1].url;
    }

    return candidates[0].url;
  } catch (error) {
    console.error("[image-selector] failed:", error);
    return candidates[0].url;
  }
}

async function fetchStockImage(query: string, completeBrief: string = query): Promise<string | null> {
  const pexelsCandidates = await fetchPexelsImages(query);

  const unsplashCandidates = pexelsCandidates.length === 0 ? await fetchUnsplashImages(query) : [];

  const candidates = [...pexelsCandidates, ...unsplashCandidates];

  if (candidates.length === 0) {
    console.error(`[stock-image] no candidates for "${query}"`);
    return null;
  }

  return selectBestImage(candidates, query, completeBrief);
}

async function fetchUnsplashImages(query: string): Promise<ImageCandidate[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn("[unsplash] UNSPLASH_ACCESS_KEY is not set");
    return [];
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=squarish`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[unsplash] request failed: ${response.status} ${response.statusText}`, body);
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        id: string;
        urls?: {
          regular?: string;
        };
      }>;
    };

    return (data.results ?? [])
      .map((image) => ({
        id: `unsplash-${image.id}`,
        url: image.urls?.regular ?? "",
        source: "unsplash" as const,
      }))
      .filter((image) => image.url);
  } catch (error) {
    console.error("[unsplash] fetch failed:", error);
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
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=square`;

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
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
          large?: string;
        };
      }>;
    };

    return (data.photos ?? [])
      .map((photo) => ({
        id: `pexels-${photo.id}`,
        url: photo.src?.large ?? "",
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
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

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

  if (unsplashKey) {
    try {
      const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
      const bodyText = await r.text();
      let body: unknown = bodyText;

      try {
        body = JSON.parse(bodyText);
      } catch {
        // Keep raw text.
      }

      results.unsplash = {
        ok: r.ok,
        status: r.status,
        statusText: r.statusText,
        keyPrefix: unsplashKey.slice(0, 6),
        body,
      };
    } catch (error) {
      results.unsplash = {
        ok: false,
        reason: "fetch threw",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    results.unsplash = {
      ok: false,
      reason: "UNSPLASH_ACCESS_KEY is not set in the environment",
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
    const { purpose, styles, boardType, layoutStyle, imageCount, logoDescription, logoImageDataUrl } = parsed.data;

    const promptText = boardType === "brandboard"
      ? `
COMPLETE BRAND BRIEF
Brand description:
"${purpose}"

Core principles / ethos:
${styles.join(", ")}

Logo description:
${logoDescription?.trim() ? `"${logoDescription.trim()}"` : "No written logo description provided."}

Reference logo:
${logoImageDataUrl ? "A logo image is attached. Analyse it together with the written brief." : "No reference logo image provided."}

BOARD DIRECTION
Treat every section above as part of one connected brand brief.
Do not reduce this brief to the brand's main product, industry, or a few keywords.
Analyse all relevant details before generating the board.
Create a memorable brand title, concise tagline, visual direction paragraph, useful keywords, palette, and the required 9-tile brand identity system.
`
      : `
COMPLETE MOODBOARD BRIEF
User's description:
"${purpose}"

Selected visual directions / vibe:
${styles.join(", ")}

Selected layout:
${layoutStyle}

Requested number of image tiles:
${imageCount}

BOARD DIRECTION
Treat every section above as one connected creative brief.
The description defines the concept.
The selected visual directions define how the concept should visually feel.
The selected layout should influence the hierarchy and organisation of the board.
The requested image count determines how many distinct visual references must be included.
Analyse the complete brief before generating any tile.
Do not reduce the description to one or two keywords.
Consider all visually relevant details and distribute them intelligently across the board.
Include exactly ${imageCount} tiles of type "image" and create an appropriate supporting mix of text, color, and quote tiles.
Give the board a memorable title, concise tagline, visual direction paragraph, and useful keywords.
`;

    const moodboard = await createMoodboard(boardType, promptText, boardType === "brandboard" ? logoImageDataUrl : undefined);

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
    const imageUrl = await fetchStockImage(query, query);
    res.json({ imageUrl });
  } catch (error) {
    console.error("[moodboards/search-image] failed:", error);
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
    const { purpose, styles, prompt, promptHistory, moodboard, boardType, layoutStyle, imageCount } = parsed.data;

    const refined = await createMoodboard(
      boardType,
      `Refine this existing ${boardType} for "${purpose}" using the selected styles: ${styles.join(", ")}. Preferred layout composition: ${layoutStyle}. Target image tile count: ${imageCount}.
The user's requested change is: "${prompt}".
This change must be clearly visible in the result: update the specific tiles it affects (their label, value, and/or accent color), and reflect it in the direction paragraph and keywords too. Do not re-generate tiles unrelated to this request.
Previous refinement requests, in order: ${promptHistory?.length ? promptHistory.map((item, index) => `${index + 1}. ${item}`).join(" | ") : "none yet"}.
Keep tiles that are unrelated to this request as they are, but change what the request asks for.
Existing moodboard JSON:
${JSON.stringify(moodboard)}`,
    );

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
