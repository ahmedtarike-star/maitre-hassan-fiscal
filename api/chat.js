export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "Clé GROQ_API_KEY manquante sur Vercel" } });

  try {
    const { system, messages, max_tokens } = req.body;

    const groqMessages = [];
    if (system) groqMessages.push({ role: "system", content: system });
    (messages || []).filter(m => m.content?.trim()).forEach(m => {
      groqMessages.push({ role: m.role, content: m.content.trim() });
    });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: max_tokens || 2000,
        temperature: 0.7,
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({ error: { message: `Groq: ${data.error?.message || JSON.stringify(data)}` } });
    }

    const text = data.choices?.[0]?.message?.content || "Réponse vide.";
    return res.status(200).json({ content: [{ type: "text", text }] });

  } catch (err) {
    return res.status(500).json({ error: { message: `Erreur serveur: ${err.message}` } });
  }
}
