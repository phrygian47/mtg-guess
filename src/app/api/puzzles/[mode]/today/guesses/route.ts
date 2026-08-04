import {
  getCurrentPuzzleDate,
  normalizeTimezone,
} from "@/lib/game/dailyPuzzles";
import { getDailyPuzzleAnswer } from "@/lib/game/puzzleReads";
import { getChainPuzzleForDate } from "@/lib/game/chainPuzzles";
import { clampRevealed, normalizeChainToken } from "@/lib/game/chainTokens";
import { normalizePuzzleMode } from "@/lib/game/gameModes";

type RouteContext = {
  params: Promise<{ mode: string }>;
};

type GuessBody = {
  timezone?: unknown;
  oracle_id?: unknown;
  guess_count?: unknown;
  position?: unknown;
  guess?: unknown;
  revealed?: unknown;
};

const SET_AND_MANA_HINT_GUESS_COUNT = 6;
const RULES_TEXT_HINT_GUESS_COUNT = 10;

export async function POST(req: Request, context: RouteContext) {
  try {
    const { mode: rawMode } = await context.params;
    const mode = normalizePuzzleMode(rawMode);

    if (!mode || mode === "salt-score") {
      // Salt score is answered by revealing scores, not by guessing.
      return Response.json(
        { error: "This mode does not accept guesses." },
        { status: 404 },
      );
    }

    const body = (await req.json()) as GuessBody;
    const timezone = normalizeTimezone(body.timezone);
    const puzzleDate = await getCurrentPuzzleDate(timezone);

    if (mode === "chain-link") {
      return chainGuess(body, puzzleDate);
    }

    return dailyPuzzleGuess(mode, body, puzzleDate);
  } catch (error) {
    console.error("POST /api/puzzles/[mode]/today/guesses crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function dailyPuzzleGuess(
  mode: "classic" | "art",
  body: GuessBody,
  puzzleDate: string,
) {
  const oracleId = normalizeString(body.oracle_id);

  if (!oracleId) {
    return Response.json({ error: "Missing oracle_id." }, { status: 400 });
  }

  const card = await getDailyPuzzleAnswer(mode, puzzleDate);

  if (!card) {
    return Response.json(
      { error: "No puzzle card found for today." },
      { status: 404 },
    );
  }

  const answer = oracleId.toLowerCase() === card.oracle_id.toLowerCase();

  if (answer) {
    return Response.json(
      mode === "art"
        ? {
            answer,
            name: card.name,
            image_normal: card.image_normal,
            art_crop: card.art_crop,
          }
        : {
            answer,
            name: card.name,
            image_normal: card.image_normal,
          },
      { status: 201 },
    );
  }

  if (mode === "classic") {
    return Response.json({ answer }, { status: 201 });
  }

  const guessCount = normalizeGuessCount(body.guess_count);
  const showSetAndMana = guessCount >= SET_AND_MANA_HINT_GUESS_COUNT;
  const showRules = guessCount >= RULES_TEXT_HINT_GUESS_COUNT;

  return Response.json(
    {
      answer,
      set_name: showSetAndMana ? card.set_name : undefined,
      mana_cost: showSetAndMana ? card.mana_cost : undefined,
      oracle_text: showRules ? card.oracle_text : undefined,
    },
    { status: 201 },
  );
}

async function chainGuess(body: GuessBody, puzzleDate: string) {
  const position = normalizePosition(body.position);

  if (position == null) {
    return Response.json(
      { error: "position must be an integer above 0." },
      { status: 400 },
    );
  }

  const puzzle = await getChainPuzzleForDate(puzzleDate);

  if (!puzzle) {
    return Response.json(
      { error: "No chain puzzle available." },
      { status: 404 },
    );
  }

  const step = puzzle.steps[position];

  if (!step) {
    return Response.json({ error: "Unknown row." }, { status: 400 });
  }

  // Solving a row completes the link that starts on the row above it.
  const linkStep = puzzle.steps[position - 1];
  const link = linkStep
    ? {
        oracle_id: linkStep.link_oracle_id,
        name: linkStep.link_card_name,
        image_normal: linkStep.link_card_image,
      }
    : null;

  const guess = typeof body.guess === "string" ? body.guess : "";
  const revealed = clampRevealed(step.token, body.revealed);

  if (normalizeChainToken(guess) === normalizeChainToken(step.token)) {
    return Response.json(
      {
        correct: true,
        token: step.token,
        revealed: step.token.length,
        exhausted: false,
        link,
      },
      { status: 201 },
    );
  }

  // A miss buys the next letter. When the last one falls the row is given
  // away, and the client should score it as unsolved.
  const nextRevealed = Math.min(revealed + 1, step.token.length);
  const exhausted = nextRevealed >= step.token.length;

  return Response.json(
    {
      correct: false,
      token: exhausted ? step.token : null,
      revealed: nextRevealed,
      prefix: step.token.slice(0, nextRevealed),
      exhausted,
      link: exhausted ? link : null,
    },
    { status: 201 },
  );
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGuessCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizePosition(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }

  return value;
}
