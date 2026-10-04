import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-5";

if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY is not configured.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const allowedOrigins = (process.env.FRAMER_SITE_ORIGIN || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allows server-to-server tools/curl while restricting browser origins.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, false);
    return callback(null, allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX || 30),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment and try again."
  }
});

app.use("/api/", limiter);

const SYSTEM_PROMPT = `
You are Kaivro AI, a friendly expert gaming assistant.

Your job is to help players with games across PC, console, mobile, and browser.
You can discuss games such as Minecraft, Roblox, Fortnite, GTA, Valorant,
Call of Duty, PUBG/BGMI, Free Fire, Terraria, Elden Ring, Pokémon, and
other games.

Give practical, accurate, easy-to-follow answers. When a game has multiple
versions/platforms, ask for the version or platform only when it materially
changes the answer.

For builds, loadouts, commands, settings, strategies, quests, bosses,
crafting, troubleshooting, and progression, use clear steps and examples.

Do not claim that a game has a feature, item, patch, command, or mechanic if
you are uncertain. For information that may have changed recently, clearly
say that the player should verify the current patch/version.

Do not help with cheating, credential theft, malware, account theft, exploits
against real services, or bypassing paid access/security. You may explain
legitimate game mechanics, modding, server administration, accessibility,
and fair-play optimization.

Keep responses concise by default, but provide more detail when the player
asks for it.
`.trim();

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-20)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 8000)
    }))
    .filter((m) => m.content.length > 0);
}

app.get("/", (_req, res) => {
  res.json({
    name: "Kaivro AI Backend",
    status: "online",
    endpoints: {
      health: "GET /api/health",
      chat: "POST /api/chat"
    }
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "kaivro-ai-backend",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key is not configured on the server."
      });
    }

    const { message, game, platform, history } = req.body || {};

    if (typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        error: "message is required."
      });
    }

    if (message.length > 8000) {
      return res.status(400).json({
        error: "message is too long. Maximum length is 8000 characters."
      });
    }

    const priorMessages = cleanMessages(history);

    const context = [
      game ? `Game: ${String(game).slice(0, 120)}` : "",
      platform ? `Platform: ${String(platform).slice(0, 80)}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const currentInput = context
      ? `${context}\n\nPlayer message:\n${message.trim()}`
      : message.trim();

    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: [
        ...priorMessages,
        {
          role: "user",
          content: currentInput
        }
      ],
      max_output_tokens: 900
    });

    return res.json({
      reply: response.output_text || "I couldn't generate a response.",
      responseId: response.id,
      model: MODEL
    });
  } catch (error) {
    console.error("Chat error:", error);

    const status = Number(error?.status) || 500;

    if (status === 401) {
      return res.status(500).json({
        error: "The backend OpenAI API key is invalid."
      });
    }

    if (status === 429) {
      return res.status(503).json({
        error: "AI service is temporarily busy. Please try again shortly."
      });
    }

    return res.status(500).json({
      error: "Something went wrong while generating the AI response."
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Kaivro AI backend running on http://localhost:${PORT}`);
});
