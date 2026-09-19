import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ products });
}

interface ProductInput {
  name: string;
  slug: string;
  partNumber: string;
  category: string;
  description?: string;
  price: number;
  inStock: boolean;
  isActive: boolean;
  images: string[];
  engineNumbers: string[];
}

function validate(body: Partial<ProductInput>): string | null {
  if (!body.name?.trim()) return "Name is required.";
  if (!body.slug?.trim()) return "Slug is required.";
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens.";
  }
  if (!body.partNumber?.trim()) return "Part number is required.";
  if (!body.category?.trim()) return "Category is required.";
  if (body.price === undefined || body.price === null || isNaN(Number(body.price))) {
    return "A valid price is required.";
  }
  if (Number(body.price) < 0) return "Price can't be negative.";
  return null;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const error = validate(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const existing = await prisma.product.findUnique({ where: { slug: body.slug } });
  if (existing) {
    return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name: body.name.trim(),
      slug: body.slug.trim(),
      partNumber: body.partNumber.trim(),
      category: body.category.trim(),
      description: body.description?.trim() || null,
      price: Number(body.price),
      inStock: Boolean(body.inStock),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      engineNumbers: Array.isArray(body.engineNumbers) ? body.engineNumbers.filter(Boolean) : [],
    },
  });

  return NextResponse.json({ product });
}
