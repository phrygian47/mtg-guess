export default function parseColor(color: string) {
  const normalizedColor = color.toLowerCase();
  switch (normalizedColor) {
    case "u":
      return "Blue";
    case "w":
      return "White";
    case "b":
      return "Black";
    case "r":
      return "Red";
    case "g":
      return "Green";
    default:
      return "Colorless";
  }
}
