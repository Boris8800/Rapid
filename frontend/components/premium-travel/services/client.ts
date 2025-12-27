export interface ChatResponse {
  text: string;
  links?: { uri: string; title: string }[];
}

export interface DestinationHighlight {
  title: string;
  description: string;
  imageUrl: string;
}

export const getRouteMapLink = async (pickup: string, dropoff: string): Promise<string> => {
  const fallback = `https://www.google.com/maps/dir/${encodeURIComponent(pickup)}/${encodeURIComponent(dropoff)}`;

  try {
    const res = await fetch(
      `/api/premium-travel/route-map?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as { url?: string };
    return data.url || fallback;
  } catch {
    return fallback;
  }
};

export const getDestinationHighlight = async (destination: string): Promise<DestinationHighlight | null> => {
  try {
    const res = await fetch(
      `/api/premium-travel/destination-highlight?destination=${encodeURIComponent(destination)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DestinationHighlight;
    if (!data?.title || !data?.description || !data?.imageUrl) return null;
    return data;
  } catch {
    return null;
  }
};

export const chatWithConcierge = async (
  history: { role: string; parts: string }[],
  message: string,
): Promise<ChatResponse> => {
  try {
    const res = await fetch('/api/premium-travel/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ history, message }),
    });

    if (!res.ok) {
      return { text: "I apologize, but I'm having trouble connecting right now. How else may I assist?" };
    }

    const data = (await res.json()) as ChatResponse;
    if (!data?.text) {
      return { text: "I apologize, I couldn't generate a response right now." };
    }

    return data;
  } catch {
    return { text: "I apologize, but I'm having trouble connecting right now. How else may I assist?" };
  }
};
