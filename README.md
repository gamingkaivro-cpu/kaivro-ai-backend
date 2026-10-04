# Kaivro AI Backend

Backend for the Framer-based Kaivro AI gaming chatbot.

## Architecture

Framer chatbot UI -> `POST /api/chat` -> OpenAI Responses API

The OpenAI API key is server-side only.

## 1. Install

```bash
npm install
```

## 2. Configure locally

Copy `.env.example` to `.env` and fill in:

```env
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=gpt-5
FRAMER_SITE_ORIGIN=https://your-site.framer.website
```

Do NOT put the OpenAI key in Framer code.

## 3. Run

```bash
npm run dev
```

Health check:

```text
http://localhost:3000/api/health
```

## 4. Test chat

```bash
curl -X POST http://localhost:3000/api/chat   -H "Content-Type: application/json"   -d '{
    "message": "Give me 5 beginner tips for Minecraft survival.",
    "game": "Minecraft",
    "platform": "PC",
    "history": []
  }'
```

## 5. Deploy to Vercel

Push this folder to GitHub, import the repository into Vercel, then add these
Environment Variables in the Vercel project:

- `OPENAI_API_KEY` = your OpenAI API key (Secret)
- `OPENAI_MODEL` = `gpt-5`
- `FRAMER_SITE_ORIGIN` = your exact Framer site origin
- `RATE_LIMIT_MAX` = `30`
- `RATE_LIMIT_WINDOW_MS` = `60000`

Redeploy after changing environment variables.

Your backend URL will look like:

```text
https://your-backend.vercel.app
```

## 6. Framer request

Your Framer chat component should POST JSON to:

```text
https://your-backend.vercel.app/api/chat
```

Example request body:

```json
{
  "message": "What is the best early-game sword?",
  "game": "Minecraft",
  "platform": "PC",
  "history": [
    {
      "role": "user",
      "content": "I'm starting a new survival world."
    },
    {
      "role": "assistant",
      "content": "Nice! What are you trying to build first?"
    }
  ]
}
```

The response is:

```json
{
  "reply": "....",
  "responseId": "resp_...",
  "model": "gpt-5"
}
```

## Security notes

- Never commit `.env`.
- Never expose `OPENAI_API_KEY` in Framer.
- Do not use `NEXT_PUBLIC_OPENAI_API_KEY` or any browser-exposed API-key variable.
- Keep the backend rate limit enabled.
- Set `FRAMER_SITE_ORIGIN` to your real Framer domain in production.
- If you later add accounts, authentication, saved chats, or payments, add
  those server-side rather than trusting browser-provided user IDs.
