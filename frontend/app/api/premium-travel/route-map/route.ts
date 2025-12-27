import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pickup = (searchParams.get('pickup') || '').trim();
  const dropoff = (searchParams.get('dropoff') || '').trim();

  const fallback = `https://www.google.com/maps/dir/${encodeURIComponent(pickup)}/${encodeURIComponent(dropoff)}`;

  if (!pickup || !dropoff) {
    return NextResponse.json({ url: fallback }, { status: 200 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ url: fallback }, { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Provide a Google Maps navigation link for a journey from "${pickup}" to "${dropoff}" in the UK.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const chunks: unknown[] = Array.isArray(rawChunks) ? rawChunks : [];
    const mapsChunk = chunks.find((chunk) => {
      if (!chunk || typeof chunk !== 'object') return false;
      return Boolean((chunk as { maps?: unknown }).maps);
    });

    const url = (() => {
      if (!mapsChunk || typeof mapsChunk !== 'object') return undefined;
      const maps = (mapsChunk as { maps?: unknown }).maps;
      if (!maps || typeof maps !== 'object') return undefined;
      const uri = (maps as { uri?: unknown }).uri;
      return typeof uri === 'string' ? uri : undefined;
    })();

    return NextResponse.json({ url: url || fallback }, { status: 200 });
  } catch {
    return NextResponse.json({ url: fallback }, { status: 200 });
  }
}
