import { NextResponse } from "next/server";
import { HttpError, logError } from "./text";

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "入力を確認してください。");
  }
}
import { cookieOptions } from "./session";

export function jsonError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  logError("api", err);
  return NextResponse.json({ error: "うまくいきませんでした。" }, { status: 500 });
}

export function withCookie(
  body: unknown,
  cookies: { name: string; value: string; maxAge: number }[],
  status = 200,
) {
  const response = NextResponse.json(body, { status });
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      ...cookieOptions,
      maxAge: cookie.maxAge,
    });
  }
  return response;
}

export function clearCookie(body: unknown, name: string) {
  const response = NextResponse.json(body);
  response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
