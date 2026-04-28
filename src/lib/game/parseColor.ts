export default function parseColor(colors: string[]): string[] {
  return colors.map((color) => {
    switch (color.toLowerCase()) {
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
  });
}
