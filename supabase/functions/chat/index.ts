import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENIA_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: "userId y message requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save user message
    await supabase.from("devchat_memory").insert({
      user_id: userId,
      role: "user",
      content: message,
    });

    // Get user memory
    const { data: memoryData } = await supabase
      .from("structured_memory")
      .select("key, value")
      .eq("user_id", userId);

    const memory: Record<string, string> = {};
    memoryData?.forEach((m) => {
      if (!m.key.startsWith("file:")) {
        memory[m.key] = m.value;
      }
    });

    // Get recent history
    const { data: history } = await supabase
      .from("devchat_memory")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const historyText = history
      ?.reverse()
      .map((h) => `${h.role}: ${h.content}`)
      .join("\n") || "Sin historial";

    // Detect intent
    const lower = message.toLowerCase();
    let systemPrompt = `Eres SYSTEM-OS, un asistente conversacional con memoria persistente.
El usuario se llama ${memory.name || "desconocido"}.
Trabaja en: ${memory.projects || "no especificado"}.

Historial reciente:
${historyText}

Responde de forma directa, clara y útil. Sin rellenos.`;

    // Handle specific intents
    if (lower.includes("me llamo")) {
      const match = message.match(/me llamo (\w+)/i);
      if (match?.[1]) {
        await supabase.from("structured_memory").upsert(
          { user_id: userId, key: "name", value: match[1] },
          { onConflict: "user_id,key" }
        );
        const response = `Hola ${match[1]}. Lo recordaré.`;
        await supabase.from("devchat_memory").insert({
          user_id: userId,
          role: "assistant",
          content: response,
        });
        return new Response(JSON.stringify({ response }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (lower.includes("trabajo en")) {
      const match = message.match(/trabajo en (.+)/i);
      if (match?.[1]) {
        const project = match[1].trim();
        const existing = memory.projects || "";
        const projects = existing ? `${existing}, ${project}` : project;
        await supabase.from("structured_memory").upsert(
          { user_id: userId, key: "projects", value: projects },
          { onConflict: "user_id,key" }
        );
        const response = `Entendido. Trabajas en ${project}.`;
        await supabase.from("devchat_memory").insert({
          user_id: userId,
          role: "assistant",
          content: response,
        });
        return new Response(JSON.stringify({ response }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (lower.includes("como me llamo") || lower.includes("quien soy")) {
      const response = memory.name
        ? `Te llamas ${memory.name}.`
        : "No tengo tu nombre registrado. ¿Cómo te llamas?";
      await supabase.from("devchat_memory").insert({
        user_id: userId,
        role: "assistant",
        content: response,
      });
      return new Response(JSON.stringify({ response }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lower.includes("en que trabajo") || lower.includes("que proyectos")) {
      const response = memory.projects
        ? `Trabajas en: ${memory.projects}.`
        : "No tengo registrado en qué trabajas. ¿En qué proyectos estás?";
      await supabase.from("devchat_memory").insert({
        user_id: userId,
        role: "assistant",
        content: response,
      });
      return new Response(JSON.stringify({ response }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI for general responses
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const openaiData = await openaiRes.json();
    const response = openaiData.choices?.[0]?.message?.content || "Sin respuesta";

    // Save assistant response
    await supabase.from("devchat_memory").insert({
      user_id: userId,
      role: "assistant",
      content: response,
    });

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
