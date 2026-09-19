import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";

export async function POST() {
  destroyAdminSession();
  return NextResponse.json({ ok: true });
}
