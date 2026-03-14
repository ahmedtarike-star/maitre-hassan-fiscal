export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "Clé GEMINI_API_KEY manquante" } });

  try {
    const { system, messages, max_tokens } = req.body;

    const contents = (messages || [])
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.trim() }]
      }));

    if (!contents.length) return res.status(400).json({ error: { message: "Message vide" } });

    const body = {
      ...(system && { system_instruction: { parts: [{ text: system }] } }),
      contents,
      generationConfig: { maxOutputTokens: max_tokens || 2000, temperature: 0.7 }
    };

    // v1 + gemini-1.5-flash-latest = free tier garanti
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

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
    return res.status(500).json({ error: { message: `Erreur: ${err.message}` } });
  }
}
