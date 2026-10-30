import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: "18mb" }));

// Lightweight in-memory rate limit for AI endpoints. For multi-instance production,
// replace this with a shared store (for example Redis) and authenticated user IDs.
const aiRequestBuckets = new Map<string, { count: number; resetAt: number }>();
app.use("/api/ai", (req, res, next) => {
  if (req.method !== "POST") return next();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (aiRequestBuckets.size > 1000) {
    for (const [ip, item] of aiRequestBuckets) {
      if (item.resetAt <= now) aiRequestBuckets.delete(ip);
    }
  }
  const bucket = aiRequestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    aiRequestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (bucket.count >= 30) {
    return res.status(429).json({ error: "AI so‘rovlari limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring.", retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) });
  }
  bucket.count += 1;
  return next();
});

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 2
): ReturnType<typeof ai.models.generateContent> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = String(err?.message || err);
      const isTransient =
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED");
      if (isTransient && attempt <= maxRetries) {
        const delayMs = attempt * 1500;
        console.warn(
          `[Gemini API] Transient issue detected (${errMsg.slice(0, 80)}). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}

function formatAiError(error: any, language: string = "uz"): string {
  const msg = String(error?.message || error || "");
  if (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand")
  ) {
    if (language === "ru") {
      return "Модель ИИ временно испытывает повышенную нагрузку. Пожалуйста, повторите запрос через несколько секунд.";
    }
    if (language === "en") {
      return "The AI model is experiencing transient high demand. Please try again in a few moments.";
    }
    return "AI modeli ayni paytda yuqori yuklama ostida. Iltimos, bir necha soniyadan so'ng qayta urinib ko'ring.";
  }
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  ) {
    if (language === "ru") {
      return "Превышен лимит запросов к ИИ. Пожалуйста, подождите минуту перед следующим запросом.";
    }
    if (language === "en") {
      return "AI rate limit reached. Please wait a minute before requesting again.";
    }
    return "AI so'rovlar limiti oshdi. Iltimos, bir daqiqadan so'ng qayta urinib ko'ring.";
  }
  if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
    return "GEMINI_API_KEY yaroqsiz yoki noto'g'ri sozlangan. Iltimos, AI Studio Secrets bo'limida to'g'ri kalitni kiriting.";
  }
  return error?.message || "AI xizmati bilan aloqa o'rnatishda xatolik yuz berdi.";
}



// System Status endpoint
app.get("/api/ai/status", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    model: "gemini-3.8-flash",
    standards: ["PUE 7.1", "IEC 60364", "GOST 30331", "NEC NFPA 70"],
  });
});

// AI Audit Route - Comprehensive Electrical Compliance & Load Check
app.post("/api/ai/audit", async (req, res) => {
  const { project, language = "uz" } = req.body;
  if (!project) {
    return res.status(400).json({ error: "Loyiha ma'lumotlari kiritilmadi (Project data is missing)" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "GEMINI_API_KEY sozlanmagan. Iltimos, AI Studio Secrets bo'limida GEMINI_API_KEY kalitini kiriting.",
      requiresKey: true,
    });
  }

  try {
    // Normalize room and device data from either data model structure
    const roomList = project.rooms && Array.isArray(project.rooms) && project.rooms.length > 0
      ? project.rooms
      : project.roomData
        ? [
            {
              name: project.roomData.roomName || "Main Hall",
              length: project.roomData.lengthMeters || 6.0,
              width: project.roomData.widthMeters || 4.5,
              height: project.roomData.heightMeters || 3.0,
              points: project.roomData.points || [],
              openings: project.roomData.openings || [],
            },
          ]
        : [];

    const circuitsList = project.cadCircuits || [];
    const panelDevices = project.panelComponents || project.panel || [];
    const materialsList = project.materials || project.estimates || [];

    const prompt = `You are a Senior Principal Electrical Engineering Safety & Compliance Auditor specializing in building electrical installations complying with PUE 7.1 (ПУЭ), GOST 30331, and IEC 60364 / IEC 61439 regulations.
Analyze this electrical installation project and generate a technical, rigorous safety and compliance audit report.

Project Data:
${JSON.stringify(
  {
    name: project.name,
    code: project.code,
    standard: project.standard || "IEC 60364 / PUE 7.1",
    roomsCount: roomList.length,
    rooms: roomList.map((r: any) => ({
      name: r.name,
      dimensions: `${r.length}m x ${r.width}m x ${r.height}m (${((r.length || 0) * (r.width || 0)).toFixed(1)} m²)`,
      pointsCount: r.points?.length || 0,
      points: r.points?.map((p: any) => `${p.type || p.kind}: ${p.name || p.label} (${p.wattage || (p.powerKw ? p.powerKw * 1000 : 0)}W)`),
    })),
    circuits: circuitsList.map((c: any) => `${c.tag}: ${c.name} (${c.powerWatts}W, ${c.cableType}, Breaker: ${c.breakerRatingA}A)`),
    panelEquipment: panelDevices.map((d: any) => `${d.model || d.name} (${d.type || d.kind}, ${d.ratedCurrentA ? d.ratedCurrentA + 'A' : ''})`),
    materialsSummary: `${materialsList.length} BOM lines`,
  },
  null,
  2
)}

Target output language: ${language === "uz" ? "Uzbek (O'zbek tili, professional electrical terminology)" : language === "ru" ? "Russian" : "English"}.

Return ONLY a valid JSON object matching this schema:
{
  "summary": "Concise executive engineering summary of the project safety, load capacity and compliance (2-3 sentences)",
  "safetyScore": <number from 0 to 100>,
  "totalEstimatedLoadKw": <calculated estimated diversified active load in kW, float>,
  "mainBreakerRecommendation": "<e.g. C40 (40A) 1-phase or C32 (32A) 3-phase with recommended RCD/UZO>",
  "findings": [
    {
      "level": "critical" | "warning" | "good" | "tip",
      "title": "<Short finding title>",
      "description": "<Detailed engineering explanation and concrete corrective recommendation>",
      "rule": "<Applicable standard or code clause, e.g. PUE 7.1.34 / IEC 60364-4-41>"
    }
  ],
  "recommendations": [
    "<Actionable recommendation 1>",
    "<Actionable recommendation 2>",
    "<Actionable recommendation 3>"
  ]
}`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Audit error:", error);
    res.status(500).json({ error: formatAiError(error, language) });
  }
});

// AI Blueprint / Room Image Scanner Route (Multimodal Vision)
app.post("/api/ai/blueprint-scan", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", language = "uz" } = req.body || {};
  try {
    if (!imageBase64) {
      return res.status(400).json({ error: "Rasm ma'lumotlari kiritilmadi (No image data provided)" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY sozlanmagan. Iltimos, AI Studio Secrets bo'limida GEMINI_API_KEY kalitini kiriting.",
        requiresKey: true,
      });
    }

    if (typeof imageBase64 !== "string" || imageBase64.length > 16_000_000) {
      return res.status(413).json({ error: "Rasm juda katta. 12 MB dan kichik rasm yuboring." });
    }
    const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const resolvedMimeType = dataUrlMatch?.[1] || (String(mimeType).startsWith("image/") ? mimeType : "image/jpeg");
    if (!/^image\/(jpeg|png|webp|gif)$/.test(resolvedMimeType)) {
      return res.status(400).json({ error: "Қўллаб-қувватланмайдиган расм формати. JPEG, PNG, WEBP ёки GIF юборинг." });
    }

    const prompt = `You are an elite architectural electrical engineer and computer vision scanner.
Analyze this floor plan, room blueprint, architectural sketch, or actual room photo.
Detect:
1. Room title and boundaries with realistic real-world dimensions (length, width, height in meters).
2. Openings: doors and windows (which wall: "north", "south", "east", or "west", offset from corner in meters, width and height in meters).
3. Recommended electrical points (single/double sockets, wet zone sockets, 1-gang/2-gang switches, dimmers, center ceiling lights, spotlights, AC unit, distribution panel location).
   - Coordinates x and y must be normalized coordinates between 0.05 and 0.95 (0,0 is top-left, 1,1 is bottom-right of the room floor).

Output Language: ${language === "uz" ? "Uzbek" : language === "ru" ? "Russian" : "English"}.

Return ONLY a valid JSON object matching this schema:
{
  "roomName": "<e.g. Mehmonxona / Oshxona / Master Bedroom>",
  "length": <length in meters, float e.g. 5.4>,
  "width": <width in meters, float e.g. 4.2>,
  "height": <height in meters, typically 2.8 to 3.2>,
  "detectedFeatures": "<Summary of architectural features, walls, and detected zones>",
  "openings": [
    {
      "kind": "door" | "window",
      "wall": "north" | "south" | "east" | "west",
      "offset": <offset in meters from wall start>,
      "width": <width in meters, e.g. 0.9 for door, 1.4 for window>,
      "height": <height in meters, e.g. 2.1 for door, 1.5 for window>,
      "sill": <sill in meters, 0 for door, 0.85 for window>,
      "label": "<e.g. Asosiy eshik, Panoramik deraza>"
    }
  ],
  "suggestedPoints": [
    {
      "type": "socket_single" | "socket_double" | "socket_wet" | "switch_1gang" | "switch_2gang" | "switch_dimmer" | "ceiling_light" | "spotlight" | "ac_unit" | "panel",
      "x": <float between 0.08 and 0.92>,
      "y": <float between 0.08 and 0.92>,
      "wall": "north" | "south" | "east" | "west" | "ceiling",
      "label": "<Descriptive label, e.g. TV rozetkalar bloki, Kirish kaliti, Lyustra>",
      "wattage": <typical power in watts, e.g. 600 for socket, 250 for light, 2400 for AC>
    }
  ],
  "estimatedPowerKw": <total diversified load in kW>
}`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: resolvedMimeType,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Blueprint scan error:", error);
    res.status(500).json({
      error: formatAiError(error, language),
    });
  }
});

// AI Turnkey Project Generator Route
app.post("/api/ai/generate-project", async (req, res) => {
  const { prompt: userPrompt, currency = "UZS", language = "uz" } = req.body;
  if (!userPrompt?.trim()) {
    return res.status(400).json({ error: "Loyiha talabi kiritilmadi (User prompt is missing)" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "GEMINI_API_KEY sozlanmagan. Iltimos, AI Studio Secrets bo'limida GEMINI_API_KEY kalitini kiriting.",
      requiresKey: true,
    });
  }

  try {
    const systemPrompt = `You are a Master Electrical Systems Architect and Chief Electrical Engineer complying with PUE 7.1, GOST, and IEC 60364.
Generate a complete, turnkey electrical engineering project from the user's description.
Design:
1. Coordinated rooms with realistic architectural dimensions and openings (doors, windows).
2. Full complement of electrical installation points (sockets, switches, ceiling/spotlights, distribution board, high-load appliance points).
3. Distribution panel DIN-rail protective components (incomer MCB, RCD/UZO, voltage monitoring relay, individual branch MCBs).
4. Itemized Bill of Materials (estimates/BOM) with realistic quantities, wastage % and prices in ${currency}.
5. Branch circuits with cable sizes (1.5mm² for lights, 2.5mm² for sockets, 4.0mm² for heavy appliances).

User brief: "${userPrompt}"
Language: ${language === "uz" ? "Uzbek (O'zbek tili)" : language === "ru" ? "Russian" : "English"}.

Return ONLY a valid JSON object matching this schema:
{
  "name": "<Professional Project Title, e.g. Mirabad Penthouse Smart Electrical Plan>",
  "description": "<Detailed engineering description with design considerations>",
  "type": "Residential" | "Commercial" | "Industrial",
  "rooms": [
    {
      "name": "<Room Name, e.g. Mehmonxona / Oshxona / Yotoqxona>",
      "length": <length in meters, e.g. 5.2>,
      "width": <width in meters, e.g. 4.0>,
      "height": <height in meters, e.g. 3.0>,
      "note": "<Technical note on room environment, e.g. Nam zona / TV multimedia zonasi>",
      "openings": [
        {
          "kind": "door" | "window",
          "wall": "north" | "south" | "east" | "west",
          "offset": <offset in meters>,
          "width": <width in meters>,
          "height": <height in meters>,
          "sill": <sill in meters>,
          "label": "<Label, e.g. Kirish eshigi / Asosiy deraza>"
        }
      ],
      "points": [
        {
          "type": "socket_single" | "socket_double" | "socket_wet" | "switch_1gang" | "switch_2gang" | "switch_dimmer" | "ceiling_light" | "spotlight" | "ac_unit" | "panel",
          "x": <float 0.1 to 0.9>,
          "y": <float 0.1 to 0.9>,
          "wall": "north" | "south" | "east" | "west" | "ceiling",
          "label": "<Point label>",
          "wattage": <watts>
        }
      ]
    }
  ],
  "circuits": [
    {
      "tag": "<e.g. QF1, QF2>",
      "name": "<Circuit Name, e.g. Mehmonxona rozetkalar>",
      "phase": "L1" | "L2" | "L3",
      "powerWatts": <total circuit power in watts>,
      "cableType": "VVGng-LS 3x2.5" | "VVGng-LS 3x1.5" | "VVGng-LS 3x4.0",
      "breakerRatingA": <10 | 16 | 25 | 32 | 40>,
      "cableLengthMeters": <estimated length in meters>
    }
  ],
  "panel": [
    {
      "name": "<e.g. Kirish avtomati C40 2P, UZO 40A 30mA, Kuchlanish relesi, Guruh avtomatlari>",
      "kind": "MCB" | "RCD" | "RCBO" | "Contactor" | "Terminal",
      "modules": <number of DIN modules, e.g. 1, 2, 3>,
      "poles": <number of poles, e.g. 1, 2, 3, 4>,
      "unitPrice": <estimated price in ${currency}>
    }
  ],
  "estimates": [
    {
      "name": "<Material item name, e.g. VVGng-LS 3x2.5 mm² mis kabel>",
      "category": "Cable" | "Conduit" | "Outlet" | "Switch" | "Light" | "Panel" | "Protection" | "Accessory",
      "quantity": <number>,
      "unit": "m" | "pcs" | "set",
      "price": <unit price in ${currency}>,
      "waste": <waste %, e.g. 10>,
      "labor": <labor cost per unit in ${currency}>
    }
  ],
  "notes": "<Summary of design standards (PUE 7.1 / IEC 60364) and installation notes>"
}`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate project error:", error);
    res.status(500).json({ error: formatAiError(error, language) });
  }
});

// AI Engineering Co-Pilot Chat Route
app.post("/api/ai/chat", async (req, res) => {
  const { message, projectContext, history = [], language = "uz" } = req.body;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Xabar kiritilmadi (Message is empty)" });
  }
  if (message.length > 6000) {
    return res.status(413).json({ error: "Xabar juda uzun. 6000 belgидан қисқа қилиб юборинг." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "GEMINI_API_KEY sozlanmagan. Iltimos, AI Studio Secrets bo'limida GEMINI_API_KEY kalitini kiriting.",
      requiresKey: true,
    });
  }

  try {
    const systemPrompt = `You are "ElectroVision AI PRO" - an elite Senior Electrical Engineering Technical Consultant and Co-Pilot.
You have comprehensive mastery over PUE 7.1 (Правила устройства электроустановок / Elektr qurilmalarining tuzilish qoidalari), GOST 31996 / 30331, and IEC 60364 / IEC 61439 regulations.
You advise electrical contractors, master electricians, designers, and facility engineers on:
- Cable cross-section selection and thermal ampacity derating
- Short-circuit withstand and voltage drop (ΔU) calculations
- Breaker curve selection (B, C, D) and RCD/UZO differential sensitivity (10mA, 30mA, 300mA)
- 3-phase load balancing and neutral conductor protection
- Wet area zoning (IP44/IP65 requirements in bathrooms, kitchens, outdoors)

Current Project Context:
${projectContext ? JSON.stringify(projectContext, null, 2) : "No active project loaded."}

Rules:
- Respond in: ${language === "uz" ? "Uzbek (O'zbek tili, accurate engineering terms)" : language === "ru" ? "Russian" : "English"}.
- Be precise, technical, practical, and safety-conscious.
- Cite specific regulatory clauses (e.g. PUE 7.1.34, PUE 7.1.71, IEC 60364-5-52) where appropriate.
- Provide calculation formulas when relevant (I = P / (V * cos φ)).
- Keep responses well-structured with clear markdown headings and bullet points.`;

    const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
    const validTurns = safeHistory
      .filter((h: any) => h?.text && (h.role === "user" || h.role === "model"))
      .map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: String(h.text).slice(0, 6000) }],
      }));

    while (validTurns.length > 0 && validTurns[0].role !== "user") {
      validTurns.shift();
    }

    const contents = [
      ...validTurns,
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ reply: response.text || "Xabar qabul qilindi, lekin javob bo'sh keldi." });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: formatAiError(error, language) });
  }
});

// AI Knowledge Base Search Route with Google Search Grounding for NEC & Regional Codes
app.post("/api/ai/knowledge-search", async (req, res) => {
  const { query, standard = "All" } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ error: "Search query is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in AI Studio secrets.",
      requiresKey: true,
    });
  }

  try {
    const prompt = `You are a Senior Regulatory Electrical Standards Engineer & National Electrical Code (NEC) Technical Specialist.
Search Google for current regional electrical code updates, amendments, and clauses.
Focus Standard: ${standard === 'All' ? 'NEC (NFPA 70), IEC 60364, and PUE 7.1' : standard}.
User Search Query: "${query}"

Synthesize the latest standards, recent code edition changes (such as NEC 2023 / 2026 revisions, IEC 60364-7 series amendments, or PUE updates), and engineering requirements.
Format your response as a valid JSON object matching this schema:
{
  "summary": "Clear, technical summary of the code requirement, recent updates, and primary engineering intent.",
  "snippets": [
    {
      "codeClause": "e.g. NEC 210.8(F) or IEC 60364-7-722.531.2 or PUE 7.1.71",
      "standard": "NEC NFPA 70" | "IEC 60364" | "PUE 7.1" | "GOST 30331",
      "title": "Title of the specific rule or update",
      "effectiveEdition": "e.g. 2023 / 2026 Edition or Current Adoption",
      "requirementText": "Detailed technical rule and specification details",
      "practicalImpact": "What electrical contractors, panel builders, or CAD designers must do to comply",
      "severity": "critical" | "mandatory" | "recommended",
      "category": "rcd_protection" | "earthing" | "overcurrent" | "voltage_drop" | "conduit_fire" | "spd_surge" | "wet_zones" | "panel_enclosure"
    }
  ],
  "keyChanges": [
    "Key revision bullet 1",
    "Key revision bullet 2"
  ],
  "jurisdictionNotes": "Notes on code adoption cycle, exceptions, or local amendments."
}
Only output the JSON object without additional surrounding commentary.`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || "{}";
    let parsedData: any = null;

    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // fallback
      }
    }

    if (!parsedData) {
      try {
        parsedData = JSON.parse(rawText);
      } catch (e) {
        parsedData = {
          summary: rawText,
          snippets: [
            {
              codeClause: standard !== 'All' ? standard : "NEC / IEC Standard",
              standard: standard !== 'All' ? standard : "NEC NFPA 70",
              title: query,
              effectiveEdition: "Current Code Cycle",
              requirementText: rawText.slice(0, 350),
              practicalImpact: "Review panel layout and circuit protective devices according to current regional requirements.",
              severity: "mandatory",
              category: "overcurrent"
            }
          ],
          keyChanges: [],
          jurisdictionNotes: "Verify with local Authority Having Jurisdiction (AHJ)."
        };
      }
    }

    // Extract Grounding Metadata (web citations, search queries)
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const sources: { title: string; url: string }[] = [];

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk?.web?.uri) {
          sources.push({
            title: chunk.web.title || "Official Standards / Reference",
            url: chunk.web.uri,
          });
        }
      });
    }

    const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];

    res.json({
      summary: parsedData.summary || "Code updates analyzed.",
      snippets: Array.isArray(parsedData.snippets) ? parsedData.snippets : [],
      keyChanges: Array.isArray(parsedData.keyChanges) ? parsedData.keyChanges : [],
      jurisdictionNotes: parsedData.jurisdictionNotes || "",
      sources,
      searchQueries,
      standard,
      query,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    });
  } catch (error: any) {
    console.error("Knowledge search error:", error);
    res.status(500).json({ error: error?.message || "Error searching electrical code knowledge base." });
  }
});

// Production static assets or Vite middleware in dev
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`⚡ ElectroVision AI PRO Server running on http://0.0.0.0:${port}`);
  });
}

setupServer().catch(console.error);
