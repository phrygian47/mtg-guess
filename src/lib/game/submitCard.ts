import { InfoGridRow } from "@/lib/game/types";
import { fetchWithRetry } from "@/lib/http/fetchWithRetry";

export async function submitCard(
  timezone: string,
  cardId: string,
): Promise<InfoGridRow> {
  const params = new URLSearchParams({
    timezone,
    cardId,
  });

  const res = await fetchWithRetry(`/api/game/submit-card?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to submit guess: ${res.status} ${message}`);
  }

  const data: InfoGridRow = await res.json();
  return data;
}
