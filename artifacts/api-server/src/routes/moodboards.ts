import {Router,type IRouter, type NextFunction,type Request,type Response,
} from "express";
import { getAuth } from "@clerk/express";
import OpenAI from "openai";
import {
  GenerateMoodboardBody,
  GenerateMoodboardResponse,
  RefineMoodboardBody,
  RefineMoodboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
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

    keywords: {
      type: "array",
      items: {
        type: "string",
      },
    },

    direction: {
      type: "string",
    },

    layout: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["image", "text", "color", "quote"],
          },
          label: {
            type: "string",
          },
          value: {
            type: "string",
          },
          accent: {
            type: ["string", "null"],
          },
          size: {
            type: "string",
            enum: ["small", "medium", "large"],
          },
          imageUrl: {
            type: ["string", "null"],
          },
        },
        required: [
          "type",
          "label",
          "value",
          "accent",
          "size",
          "imageUrl",
        ],
        additionalProperties: false,
      },
    },
  },

  required: [
    "id",
    "title",
    "tagline",
    "palette",
    "keywords",
    "direction",
    "layout",
  ],
  additionalProperties: false,
} as const;

type ImageCandidate = {
  id: string;
  url: string;
  caption?: string;
  source: "cosmos" | "pexels";
};

type MoodboardTile = {
  type: string;
  label: string;
  value: string;
  accent?: string | null;
  size?: string;
  imageUrl?: string | null;
};

const moodboardSystemPrompt = `
You are an expert art director and visual researcher creating a highly curated moodboard.
Return only valid JSON matching the required schema.
Your task is to transform the COMPLETE user brief into a cohesive visual direction.
The user provides their requirements through multiple parts of a creative quiz. These inputs are not separate instructions. They must be understood together as one complete creative brief.
The complete brief may include:
- a description of what the user wants to create
- the requested number of image tiles
- the selected layout or composition
- selected visual directions, style preferences, or vibe
Every relevant part of the brief must influence the final board.
FULL BRIEF ANALYSIS — REQUIRED
Before generating any title, palette, tile, or image query, analyse the ENTIRE user brief.
Do not reduce the user's description to one or two keywords.
Do not focus only on the main noun or most obvious subject.
Identify all visually relevant requirements, relationships, characteristics, details, constraints, and priorities contained across the complete brief.
Treat the user's inputs as a set of connected requirements.
The description explains WHAT is being created or explored.
The selected vibe and visual directions explain HOW it should feel and be visually expressed.
The selected layout explains HOW the visual information should be organised.
The requested image count determines HOW MUCH distinct visual information the board should contain.
These inputs must work together.
If the user provides a detailed description containing multiple requirements, the final tiles must collectively reflect those requirements rather than repeatedly representing only the most obvious concept.
Do not ignore secondary details when they are visually relevant.
VISUAL REASONING
First determine the visual strategy required for this particular brief.
Do not assume a fixed domain, aesthetic, subject matter, industry, or type of imagery.
Adapt your reasoning entirely to the user's requirements.
Determine which visual characteristics are genuinely important for communicating the brief.
These may include, when relevant:
- subject matter
- form
- composition
- atmosphere
- styling
- context
- colour
- scale
- material
- movement
- environment
- detail
- typography
- cultural context
- historical context
- realism
- abstraction

These are possibilities, not mandatory categories.
Do not use a fixed visual formula.
TILE STRATEGY
Treat the board as a carefully curated visual system.
Before generating each image tile, internally determine:
1. What part of the complete brief should this tile communicate?
2. What unique visual role should this tile play?
3. What does this tile contribute that the other tiles do not?
4. How does it support the user's requirements?
5. How does it remain visually connected to the complete board?
The visual role of every tile must be decided dynamically from the user's specific brief.
Do not use predetermined image categories.
Do not repeatedly generate variations of the same subject unless repetition is specifically required by the user's brief.
The image tiles must collectively cover the complete visual direction while remaining cohesive.
SEARCH QUERY GENERATION
For every image tile, the "value" field must contain a precise, natural-language image search query.
Each query must be based on:
- the complete user brief
- the specific purpose of that individual tile
- the selected visual direction
- the need for diversity across the board

Do not simply repeat or slightly rewrite the user's original description.
Each query should describe a clear visual subject, scene, reference, composition, or detail that is likely to exist in an image library.
Use natural search language.
Include visual details only when they improve relevance.
Avoid queries that are unnecessarily broad, vague, repetitive, or dependent entirely on abstract concepts that cannot reliably retrieve imagery.
Do not force every query into the same word count or structure.
IMAGE DIVERSITY AND COHESION
Every image should contribute something distinct.
However, the board must still feel visually connected.
Create cohesion based on the visual characteristics that are actually important to the user's brief.
Do not create cohesion simply by repeatedly searching for the same subject.
Avoid generic, cliché, repetitive, irrelevant, or weak visual interpretations when a more specific visual reference can better communicate the user's requirements.
The user's actual requirements always take priority over generic aesthetic rules.

BOARD CONSTRUCTION
Use 4-6 palette colors with valid 6-digit hex values.
Follow the requested image tile count exactly.
Create an appropriate mix of image, text, color, and quote tiles around the requested image tiles.
Respect the user's selected layout when determining hierarchy, size, emphasis, and organisation.
For quote tiles, write original copy relevant to the complete creative direction and never attribute it to a real person.
Make every tile label meaningful.
The completed moodboard should feel intentionally curated, visually intelligent, specific to the user's requirements, and composed as one complete visual direction.
Do not produce a generic interpretation.
Do not apply a default aesthetic.
Let the complete user brief determine what the board should become.
`;

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
These may involve, when relevant:
- form
- shape
- proportion
- colour
- material
- typography
- imagery
- composition
- texture
- context
- application
- interaction
- cultural references
- history
- visual contrast
- refinement
These are possibilities, not requirements.
Do not force every brand into the same identity formula.
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
For every image tile, the "value" field must contain a specific search query that can realistically retrieve a useful visual reference.
Each query must be based on:
- the complete brand description
- logo information when relevant
- core principles and ethos
- the selected vibe
- the specific purpose of that tile
- the need for diversity across the complete board
Do not repeatedly use the brand name, industry, or the same descriptive keywords.
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
The final board should feel specific to the user's requirements and provide visually useful references that could genuinely help develop the identity further.
`;

function extractImageUrls(
  value: unknown,
  urls: string[] = [],
): string[] {
  if (!value) {
    return urls;
  }

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      urls.push(value);
    }

    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      extractImageUrls(item, urls);
    });

    return urls;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    const priorityKeys = [
      "image_url",
      "imageUrl",
      "original_url",
      "originalUrl",
      "url",
      "src",
    ];

    for (const key of priorityKeys) {
      if (typeof objectValue[key] === "string") {
        const url = objectValue[key];

        if (/^https?:\/\//i.test(url)) {
          urls.push(url);
        }
      }
    }

    for (const [key, nestedValue] of Object.entries(objectValue)) {
      if (!priorityKeys.includes(key)) {
        extractImageUrls(nestedValue, urls);
      }
    }
  }

  return urls;
}

async function fetchCosmosImages(
  query: string,
): Promise<ImageCandidate[]> {
  const apiKey = process.env.PARSE_API_KEY;

  if (!apiKey) {
    console.error("[cosmos] PARSE_API_KEY is not set in the environment");
    return [];
  }

  try {
    const response = await fetch(
      "https://api.parse.bot/scraper/518f0113-a227-49a8-95cf-31124444fa1e/search_elements",
      {
        method: "POST",

        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          order: "RELEVANT",
          query,
          content_type: "IMAGE",
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      console.error(
        `[cosmos] request failed for "${query}": ${response.status} ${response.statusText} ${body}`,
      );

      return [];
    }

    const data = await response.json();

    const urls = [
      ...new Set(extractImageUrls(data)),
    ].slice(0, 6);

    if (urls.length === 0) {
      console.error(
        `[cosmos] no usable image URLs found for "${query}"`,
      );
    }

    return urls.map((url, index) => ({
      id: `cosmos-${index}`,
      url,
      source: "cosmos" as const,
    }));
  } catch (error) {
    console.error(
      `[cosmos] fetch threw for query "${query}":`,
      error,
    );

    return [];
  }
}

async function fetchPexelsImages(
  query: string,
): Promise<ImageCandidate[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error("[pexels] PEXELS_API_KEY is not set in the environment");
    return [];
  }

  try {
    const url =
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query,
      )}&per_page=6`;

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      console.error(
        `[pexels] request failed for query "${query}": ${response.status} ${response.statusText} ${body}`,
      );

      return [];
    }

    const data = (await response.json()) as {
      photos?: Array<{
        id?: number;
        alt?: string;
        src?: {
          large?: string;
          medium?: string;
          original?: string;
        };
      }>;
    };

    const candidates = (data.photos ?? [])
      .map((photo, index) => ({
        id: `pexels-${photo.id ?? index}`,

        url:
          photo.src?.large ??
          photo.src?.medium ??
          photo.src?.original ??
          "",

        caption: photo.alt ?? "",

        source: "pexels" as const,
      }))
      .filter((candidate) => candidate.url)
      .slice(0, 6);

    if (candidates.length === 0) {
      console.error(
        `[pexels] no usable images returned for "${query}"`,
      );
    }

    return candidates;
  } catch (error) {
    console.error(
      `[pexels] fetch threw for query "${query}":`,
      error,
    );

    return [];
  }
}

async function selectBestImage(
  candidates: ImageCandidate[],
  tileQuery: string,
  completeBrief: string,
  previouslySelectedImageUrls: string[] = [],
): Promise<string | null> {
  if (candidates.length === 0) {
    return null;
  }

  const candidateList = candidates
    .map(
      (candidate, index) =>
        `Candidate ${index + 1}: ${candidate.caption ?? "No caption available"}`,
    )
    .join("\n");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `
You are an expert visual curator selecting one image for a carefully curated board.

COMPLETE CREATIVE BRIEF:
${completeBrief}

CURRENT TILE SEARCH QUERY:
${tileQuery}

CANDIDATES:
${candidateList}

You must evaluate the candidate images against the COMPLETE creative brief, not just the search query.

Choose an image only if it:

- strongly fits the complete brief
- supports the specific purpose of this tile
- matches the requested visual direction and vibe
- is visually strong and compositionally useful
- adds useful visual information to the board
- does not unnecessarily repeat an already selected image

Previously selected image URLs:
${
  previouslySelectedImageUrls.length
    ? previouslySelectedImageUrls.join("\n")
    : "None"
}

If at least one candidate is genuinely suitable, return ONLY:
BEST: number
For example:
BEST: 3
If none of the candidates are suitable enough, return ONLY:
NONE
Do not explain your answer.
`,
    },

    ...candidates.map((candidate) => ({
      type: "image_url" as const,
      image_url: {
        url: candidate.url,
      },
    })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 30,

      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const answer =
      response.choices[0]?.message?.content?.trim() ?? "";

    if (/^NONE$/i.test(answer)) {
      return null;
    }

    const match = answer.match(/BEST\s*:\s*(\d+)/i);

    if (!match) {
      console.error(
        `[image-selector] invalid selection response: "${answer}"`,
      );

      return null;
    }

    const selectedIndex = Number(match[1]) - 1;

    if (
      selectedIndex < 0 ||
      selectedIndex >= candidates.length
    ) {
      return null;
    }

    return candidates[selectedIndex].url;
  } catch (error) {
    console.error(
      "[image-selector] selection failed:",
      error,
    );

    return null;
  }
}

async function fetchStockImage(
  query: string,
  completeBrief = "",
  previouslySelectedImageUrls: string[] = [],
): Promise<string | null> {
  // STEP 1:
  // Cosmos is always the primary image source.
  const cosmosCandidates = await fetchCosmosImages(query);

  if (cosmosCandidates.length > 0) {
    const selectedCosmosImage = await selectBestImage(
      cosmosCandidates,
      query,
      completeBrief,
      previouslySelectedImageUrls,
    );

    if (selectedCosmosImage) {
      return selectedCosmosImage;
    }

    console.log(
      `[stock-image] Cosmos candidates were rejected for "${query}". Falling back to Pexels.`,
    );
  } else {
    console.log(
      `[stock-image] Cosmos returned no usable candidates for "${query}". Falling back to Pexels.`,
    );
  }

  // STEP 2:
  // Pexels is only used when Cosmos has no suitable result.
  const pexelsCandidates = await fetchPexelsImages(query);

  if (pexelsCandidates.length === 0) {
    console.error(
      `[stock-image] No usable images found from Cosmos or Pexels for "${query}"`,
    );

    return null;
  }

  const selectedPexelsImage = await selectBestImage(
    pexelsCandidates,
    query,
    completeBrief,
    previouslySelectedImageUrls,
  );

  if (selectedPexelsImage) {
    return selectedPexelsImage;
  }

  console.error(
    `[stock-image] Pexels candidates were also rejected for "${query}"`,
  );

  return null;
}

async function createMoodboard(
  boardType: "moodboard" | "brandboard",
  prompt: string,
  logoImageDataUrl?: string,
): Promise<unknown> {
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  if (boardType === "brandboard" && logoImageDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: logoImageDataUrl,
      },
    });
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
      {
        role: "system",
        content:
          boardType === "brandboard"
            ? brandboardSystemPrompt
            : moodboardSystemPrompt,
      },

      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const content =
    response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty moodboard");
  }

  const parsed = JSON.parse(content) as {
    layout?: MoodboardTile[];
  };

  if (Array.isArray(parsed.layout)) {
    if (boardType === "brandboard") {
      if (parsed.layout.length > 9) {
        parsed.layout = parsed.layout.slice(0, 9);
      } else if (parsed.layout.length < 9) {
        const fallbackLabels = [
          "Logo direction",
          "Sticker mark",
          "Logo alt",
          "Icon mark",
          "Mockup",
          "Pattern",
          "Fonts",
          "Mockup",
          "Mockup",
        ];

        while (parsed.layout.length < 9) {
          const index = parsed.layout.length;

          parsed.layout.push({
            type:
              fallbackLabels[index] === "Fonts"
                ? "text"
                : "image",

            label:
              fallbackLabels[index] ?? "Mockup",

            value:
              fallbackLabels[index] === "Fonts"
                ? "Headline: Fraunces / Body: Inter"
                : "brand aesthetic reference",

            accent: null,
            size: "medium",
          });
        }
      }
    }

    // Images are selected sequentially instead of Promise.all.
    // This allows each new selection to consider previously
    // selected images and reduces unnecessary repetition.
    const selectedImageUrls: string[] = [];

    for (const tile of parsed.layout) {
      if (tile.type === "image") {
        tile.imageUrl = await fetchStockImage(
          tile.value,
          prompt,
          selectedImageUrls,
        );

        if (tile.imageUrl) {
          selectedImageUrls.push(tile.imageUrl);
        }
      }
    }
  }

  return parsed;
}

router.post(
  "/moodboards/generate",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed =
      GenerateMoodboardBody.safeParse(req.body);

    if (!parsed.success) {
      req.log.warn(
        { errors: parsed.error.message },
        "Invalid moodboard brief",
      );

      res.status(400).json({
        error: parsed.error.message,
      });

      return;
    }

    try {
      const {
        purpose,
        styles,
        boardType,
        layoutStyle,
        imageCount,
        logoDescription,
        logoImageDataUrl,
      } = parsed.data;

      const promptText =
        boardType === "brandboard"
          ? `
COMPLETE BRAND BRIEF

Brand description:
"${purpose}"

Core principles / ethos / what the brand represents:
${styles.join(", ")}

Logo description:
${
  logoDescription?.trim()
    ? `"${logoDescription.trim()}"`
    : "No written logo description provided."
}

Reference logo:
${
  logoImageDataUrl
    ? "A logo image is attached. Analyse it together with the written brief and use it as visual guidance where relevant."
    : "No reference logo image provided."
}

BOARD DIRECTION
Treat every section above as part of one connected brand brief.
Do not reduce this brief to the brand's main product, industry, or a few keywords.
Analyse all relevant details before generating the board.
The brand description, core principles, logo information, and selected vibe must work together.
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

      const moodboard =
        await createMoodboard(
          boardType,
          promptText,
          boardType === "brandboard"
            ? logoImageDataUrl
            : undefined,
        );

      res.json(
        GenerateMoodboardResponse.parse(moodboard),
      );
    } catch (error) {
      req.log.error(
        { err: error },
        "Moodboard generation failed",
      );

      res.status(500).json({
        error:
          "Moodboard generation failed. Please try again.",
      });
    }
  },
);

router.get(
  "/moodboards/search-image",
  requireAuth,
  async (req, res): Promise<void> => {
    const query =
      typeof req.query.query === "string"
        ? req.query.query.trim()
        : "";

    if (query.length < 2) {
      res.status(400).json({
        error: "A search query is required",
      });

      return;
    }

    const imageUrl = await fetchStockImage(
      query,
      `The user is manually searching for an image using this query: "${query}".`,
    );

    res.json({
      imageUrl,
    });
  },
);

router.post(
  "/moodboards/refine",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed =
      RefineMoodboardBody.safeParse(req.body);

    if (!parsed.success) {
      req.log.warn(
        { errors: parsed.error.message },
        "Invalid moodboard refinement",
      );

      res.status(400).json({
        error: parsed.error.message,
      });

      return;
    }

    try {
      const {
        purpose,
        styles,
        prompt,
        promptHistory,
        moodboard,
        boardType,
        layoutStyle,
        imageCount,
      } = parsed.data;

      const refined = await createMoodboard(
        boardType,
        `
Refine this existing ${boardType} for "${purpose}".

Selected styles:
${styles.join(", ")}

Preferred layout composition:
${layoutStyle}

Target image tile count:
${imageCount}

The user's requested change is:
"${prompt}"

This change must be clearly visible in the result.
Update the specific tiles it affects, including their label, value, accent color, or image direction where relevant.
Reflect the change in the direction paragraph and keywords too.
Do not return a board that is nearly identical to the input.
A refinement with no noticeable difference is a failure.
Previous refinement requests, in order:
${
  promptHistory?.length
    ? promptHistory
        .map(
          (item, index) =>
            `${index + 1}. ${item}`,
        )
        .join(" | ")
    : "none yet"
}

Keep tiles unrelated to this request as they are, but clearly change what the user requested.
Existing moodboard JSON:
${JSON.stringify(moodboard)}
`,
      );

      res.json(
        RefineMoodboardResponse.parse(refined),
      );
    } catch (error) {
      req.log.error(
        { err: error },
        "Moodboard refinement failed",
      );

      res.status(500).json({
        error:
          "Moodboard refinement failed. Please try again.",
      });
    }
  },
);
export default router;
