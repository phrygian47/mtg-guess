export const submitGuess = async (timezone: string, oracle_id: string) => {
  const answer = await fetch("/api/cards/guess", {
    method: "POST",
    body: JSON.stringify({
      timezone: timezone,
      oracle_id: oracle_id,
    }),
  });
  const res = await answer.json();

  return res;
};
