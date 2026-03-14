export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "Clé GEMINI_API_KEY manquante sur Vercel" } });

  try {
    const { system, messages, max_tokens } = req.body;

    const filtered = (messages || []).filter(m => m.content && m.content.trim());
    if (!filtered.length) return res.status(400).json({ error: { message: "Message vide" } });

    // Prepend system prompt to first user message (Gemini 1.5 flash doesn't support system_instruction on this endpoint)
    const contents = filtered.map((m, i) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: i === 0 && system ? `${system}\n\n---\n\n${m.content.trim()}` : m.content.trim() }]
    }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 2000,
        temperature: 0.7,
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({ error: { message: `Gemini: ${data.error?.message || JSON.stringify(data)}` } });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Réponse vide.";
    return res.status(200).json({ content: [{ type: "text", text }] });

  } catch (err) {
    return res.status(500).json({ error: { message: `Erreur serveur: ${err.message}` } });
  }
}
