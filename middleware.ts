import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FAMILY_COOKIE, KIOSK_COOKIE, verifyToken } from "@/lib/session";

const FAMILY_PUBLIC = new Set(["/api/family/register", "/api/family/login"]);
const KIOSK_PUBLIC = new Set(["/api/kiosk/status", "/api/kiosk/pair", "/api/kiosk/unlock"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/family")) {
    if (FAMILY_PUBLIC.has(pathname)) return NextResponse.next();
    const token = await verifyToken(req.cookies.get(FAMILY_COOKIE)?.value, "family");
    if (!token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/family") && pathname !== "/family/login") {
    const token = await verifyToken(req.cookies.get(FAMILY_COOKIE)?.value, "family");
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/family/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/kiosk") && !KIOSK_PUBLIC.has(pathname)) {
    const token = await verifyToken(req.cookies.get(KIOSK_COOKIE)?.value, "kiosk");
    if (!token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/family", "/family/:path*", "/api/family/:path*", "/api/kiosk/:path*"],
};
