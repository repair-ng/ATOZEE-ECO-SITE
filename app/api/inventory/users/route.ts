export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/inv-auth";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { createUserSchema } from "@/lib/inv-schemas";
import { serializeUser } from "@/lib/inv-serialize";

export const GET = inv({ roles: ["GLOBAL_ADMIN"] }, async () => {
  const users = await prisma.invUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ users: users.map(serializeUser) });
});

export const POST = inv({ roles: ["GLOBAL_ADMIN"] }, async ({ req }) => {
  const b = await readJson(req, createUserSchema);
  try {
    const u = await prisma.invUser.create({
      data: {
        username: b.username, displayName: b.displayName, role: b.role,
        // Yuchai staff mostly read Chinese, so their accounts start in Chinese.
        language: b.role === "YUCHAI_STAFF" ? "zh" : "en",
        passwordHash: await hashPassword(b.password),
      },
    });
    return NextResponse.json({ user: serializeUser(u) }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Username already exists", "DUPLICATE_USER");
    }
    throw e;
  }
});
