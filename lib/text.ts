export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function logError(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : "error";
  console.error(`[${scope}] ${message}`);
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    throw new HttpError(403, "forbidden");
  }
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "forbidden");
  }
  if (originHost !== host) {
    throw new HttpError(403, "forbidden");
  }
}

export function cleanPlace(value: string) {
  return value.replace(/[<>{}\r\n]/g, "").trim().slice(0, 80);
}

export function cleanUtterance(value: string) {
  return value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 400);
}

export function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) {
    throw new HttpError(400, "電話番号を確認してください。");
  }
  return cleaned;
}
