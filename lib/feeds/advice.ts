export function clothingAdvice(input: {
  weather: string;
  low: string | null;
  high: string | null;
  heat: boolean;
}) {
  const high = Number(input.high);
  const low = Number(input.low);
  const lines: string[] = [];
  if (/雨/.test(input.weather)) lines.push("雨なので、傘を持ってください。");
  if (input.heat || (Number.isFinite(high) && high >= 28)) {
    lines.push("暑いので、水筒と、小さな扇風機を持ってください。");
  }
  if ((Number.isFinite(low) && low <= 12) || (Number.isFinite(high) && high <= 16)) {
    lines.push("寒いので、セーターを着てください。");
  }
  if (lines.length === 0) lines.push("特別な持ち物は、なさそうです。");
  return lines.join("");
}
