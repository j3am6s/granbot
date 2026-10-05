export function tokyoParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function tokyoStartOfToday(now = new Date()) {
  const { dateKey } = tokyoParts(now);
  return new Date(`${dateKey}T00:00:00+09:00`);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayTokyo(now = new Date()) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(now);
  const index = WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
  return index < 0 ? 0 : index;
}

export function dateLabelTokyo(date: Date) {
  const { dateKey } = tokyoParts(date);
  const [, month, day] = dateKey.split("-");
  const label = ["日", "月", "火", "水", "木", "金", "土"][weekdayTokyo(date)];
  return `${Number(month)}月${Number(day)}日（${label}）`;
}

export function formatTokyo(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
