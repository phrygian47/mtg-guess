export async function submitGuess(
  timezone: string,
  selectedGuessCard: string,
): Promise<boolean> {
  const res = await fetch("/api/cards/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timezone,
      oracle_id: selectedGuessCard,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to submit guess: ${res.status} ${message}`);
  }

  const data: { answer: boolean } = await res.json();
  return data.answer;
}
