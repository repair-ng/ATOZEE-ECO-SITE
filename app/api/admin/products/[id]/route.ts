import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  if (body.slug) {
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens." },
        { status: 400 }
      );
    }
    const existing = await prisma.product.findFirst({
      where: { slug: body.slug, NOT: { id: params.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
    }
  }

  if (body.price !== undefined && isNaN(Number(body.price))) {
    return NextResponse.json({ error: "A valid price is required." }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.slug !== undefined ? { slug: body.slug.trim() } : {}),
      ...(body.partNumber !== undefined ? { partNumber: body.partNumber.trim() } : {}),
      ...(body.category !== undefined ? { category: body.category.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.inStock !== undefined ? { inStock: Boolean(body.inStock) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.images !== undefined
        ? { images: Array.isArray(body.images) ? body.images.filter(Boolean) : [] }
        : {}),
      ...(body.engineNumbers !== undefined
        ? { engineNumbers: Array.isArray(body.engineNumbers) ? body.engineNumbers.filter(Boolean) : [] }
        : {}),
    },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
