export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/inv-auth";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { updateUserSchema } from "@/lib/inv-schemas";
import { serializeUser } from "@/lib/inv-serialize";

// Global admins can edit any account (including other admins). The one guard:
// you can't demote or disable yourself, so the system can't be locked out.
export const PATCH = inv({ roles: ["GLOBAL_ADMIN"] }, async ({ req, user, params }) => {
  const b = await readJson(req, updateUserSchema);
  const target = await prisma.invUser.findUnique({ where: { id: params.id } });
  if (!target) throw new HttpError(404, "User not found", "NOT_FOUND");

  if (target.id === user.id && (b.isActive === false || (b.role && b.role !== target.role))) {
    throw new HttpError(400, "You can't disable or demote your own account", "SELF_PROTECT");
  }

  const bumpSession = b.password !== undefined || (b.role !== undefined && b.role !== target.role) || b.isActive === false;
  const updated = await prisma.invUser.update({
    where: { id: target.id },
    data: {
      ...(b.displayName !== undefined ? { displayName: b.displayName } : {}),
      ...(b.role !== undefined ? { role: b.role } : {}),
      ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
      ...(b.password !== undefined ? { passwordHash: await hashPassword(b.password) } : {}),
      ...(bumpSession ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  return NextResponse.json({ user: serializeUser(updated) });
});
