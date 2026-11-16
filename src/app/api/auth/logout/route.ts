import { NextResponse } from "next/server";
import { destroySession, sameOrigin, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
