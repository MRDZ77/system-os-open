// CoreMindEngine/services/openai.js

const OpenAI = require("openai");
const config = require("../config");

const client = new OpenAI({
  apiKey: config.openaiKey,
});

async function sendPrompt(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    throw err;
  }
}

module.exports = {
  sendPrompt,
};
