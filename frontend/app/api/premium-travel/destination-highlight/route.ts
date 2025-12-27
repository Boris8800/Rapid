import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const destination = (searchParams.get('destination') || '').trim();

  if (!destination) {
    return NextResponse.json({ error: 'Missing destination' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a refined, 2-sentence elite travel highlight for "${destination}". Focus on its unique British charm or architectural significance. Return as JSON with "title" and "description" keys.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['title', 'description'],
        },
      },
    });

    const info = (() => {
      try {
        return JSON.parse(textResponse.text || '{}') as { title?: string; description?: string };
      } catch {
        return {} as { title?: string; description?: string };
      }
    })();

    const imgResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A cinematic, elite travel photograph of ${destination}, UK. Golden hour lighting, professional architectural photography, minimalist and sophisticated aesthetic. No people, focus on landmarks or scenery.`,
          },
        ],
      },
      config: {
        imageConfig: { aspectRatio: '16:9' },
      },
    });

    let imageUrl = '';
    const rawParts = imgResponse.candidates?.[0]?.content?.parts;
    const parts: unknown[] = Array.isArray(rawParts) ? rawParts : [];

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const inlineData = (part as { inlineData?: unknown }).inlineData;
      if (!inlineData || typeof inlineData !== 'object') continue;

      const data = (inlineData as { data?: unknown }).data;
      if (typeof data !== 'string' || !data) continue;

      const mimeType = (inlineData as { mimeType?: unknown }).mimeType;
      const safeMimeType = typeof mimeType === 'string' && mimeType ? mimeType : 'image/png';
      imageUrl = `data:${safeMimeType};base64,${data}`;
      break;
    }

    if (!imageUrl) {
      return NextResponse.json({
        title: info.title || destination,
        description: info.description || `Experience the unique charm and heritage of ${destination}.`,
        imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=85&w=2400',
      });
    }

    return NextResponse.json({
      title: info.title || destination,
      description: info.description || `Experience the unique charm and heritage of ${destination}.`,
      imageUrl,
    });
  } catch {
    return NextResponse.json(
      {
        title: destination,
        description: `Experience the unique charm and heritage of ${destination}.`,
        imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=85&w=2400',
      },
      { status: 200 },
    );
  }
}
