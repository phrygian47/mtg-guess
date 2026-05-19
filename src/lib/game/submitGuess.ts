export type SubmitGuessResult = {
  answer: boolean;
  name: string;
  image_normal: string | null;
};

export async function submitGuess(
  timezone: string,
  oracle_id: string,
): Promise<SubmitGuessResult> {
  const res = await fetch("/api/game/submit-guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timezone,
      oracle_id,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to submit guess: ${res.status} ${message}`);
  }

  return res.json();
}
