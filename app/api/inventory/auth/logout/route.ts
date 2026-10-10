export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { INV_COOKIE } from "@/lib/inv-auth";
import { assertSameOrigin, handleError } from "@/lib/inv-guard";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(INV_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
