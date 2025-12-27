import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ChatRequestBody = {
  history?: { role: string; parts: string }[];
  message?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { text: 'AI concierge is not configured on this environment.' },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ text: 'Invalid request body.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ text: 'Please provide a message.' }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];

  const systemInstruction =
    "You are a professional, helpful, and sophisticated UK travel concierge for Rapid Roads. Use British English. Prices in GBP (£). Always maintain an elite and refined tone.";

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history
          .filter((h) => typeof h?.parts === 'string')
          .map((h) => ({
            role: h.role === 'model' ? ('model' as const) : ('user' as const),
            parts: [{ text: h.parts }],
          })),
        { role: 'user', parts: [{ text: message }] },
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || 'I apologize, I am unable to process that request right now.';

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const chunks: unknown[] = Array.isArray(rawChunks) ? rawChunks : [];

    const links = chunks
      .map((chunk) => {
        if (!chunk || typeof chunk !== 'object') return null;
        const web = (chunk as { web?: unknown }).web;
        if (!web || typeof web !== 'object') return null;

        const uri = (web as { uri?: unknown }).uri;
        const title = (web as { title?: unknown }).title;
        if (typeof uri !== 'string' || !uri) return null;

        return {
          uri,
          title: typeof title === 'string' && title ? title : uri,
        };
      })
      .filter((x): x is { uri: string; title: string } => x !== null);

    return NextResponse.json({ text, links });
  } catch {
    return NextResponse.json(
      { text: "I apologize, but I'm having trouble connecting right now. How else may I assist?" },
      { status: 200 },
    );
  }
}
