export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { inv, pageParams } from "@/lib/inv-guard";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = inv({}, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const who = (sp.get("user") ?? "").trim().slice(0, 64);
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const { page, pageSize, skip } = pageParams(sp);

  const createdAt: Prisma.DateTimeFilter = {};
  if (DATE.test(from)) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (DATE.test(to)) createdAt.lt = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000);

  const where: Prisma.InvMovementWhereInput = {
    ...(type === "ADDED" || type === "REMOVED" ? { type } : {}),
    ...(who ? { username: { contains: who, mode: "insensitive" } } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { partNumber: { contains: q, mode: "insensitive" } },
            { itemName: { contains: q, mode: "insensitive" } },
            { reason: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.invMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.invMovement.count({ where }),
  ]);

  return NextResponse.json({
    movements: rows.map((m) => ({
      id: m.id, partNumber: m.partNumber, itemName: m.itemName, type: m.type,
      quantity: m.quantity, balanceAfter: m.balanceAfter, reason: m.reason,
      username: m.username, createdAt: m.createdAt.toISOString(),
    })),
    total, page, pageSize,
  });
});
