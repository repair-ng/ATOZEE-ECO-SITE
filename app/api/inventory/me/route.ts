export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inv, readJson } from "@/lib/inv-guard";
import { languageSchema } from "@/lib/inv-schemas";

export const GET = inv({}, async ({ user }) => NextResponse.json({ user }));

export const PATCH = inv({}, async ({ req, user }) => {
  const { language } = await readJson(req, languageSchema);
  await prisma.invUser.update({ where: { id: user.id }, data: { language } });
  return NextResponse.json({ ok: true });
});
