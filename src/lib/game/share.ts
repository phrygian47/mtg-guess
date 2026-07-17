import { ClassicDisplayInfoGridRow } from "./classicProgress";

export function GenerateShareString(rows: ClassicDisplayInfoGridRow[]) {
  let shareString = "";

  console.log("ENTERING SHARE STRING FUNCTION");

  rows.forEach((row) => {
    if (!row) return;

    const displayOrder: Array<keyof typeof row.row> = [
      "colors",
      "mana_value",
      "type_line",
      "set",
      "rarity",
      "tags",
      "supplemental_info",
    ];
    const rowString = displayOrder
      .map((key) => {
        const cell = row.row![key];
        if (!cell || !cell.value || !cell.tone) return "";
        const tone = cell.tone;
        const direction = "direction" in cell ? cell.direction : null;
        if (cell.tone === "correct") {
          return "🟩";
        } else if (tone === "partial") {
          if (direction === "higher") return "⬆️";
          if (direction === "lower") return "⬇️";
          return "🟨";
        }
        if (tone === "wrong") {
          if (direction === "higher") return "⬆️";
          if (direction === "lower") return "⬇️";
          return "🟥";
        }
      })
      .join("");

    shareString += `${rowString}\n`;
  });
  return `\n${shareString}`;
}
