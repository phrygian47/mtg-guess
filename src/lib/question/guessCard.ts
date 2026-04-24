export function guessCard(card: string, guess: string): boolean {
  if (card === guess) {
    return true;
  }
  return false;
}
