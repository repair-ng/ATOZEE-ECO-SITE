import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/site-config";
import HeroCarousel from "@/components/HeroCarousel";

interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  images: string[];
}

export default async function HomePage() {
  const featured = (await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  })) as unknown as FeaturedProduct[];

  return (
    <div>
      <HeroCarousel />

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Not sure which part fits?</h2>
        <p className="mb-6 text-slate-600">
          Search our catalog by engine number — we&apos;ll show you exactly which parts are
          built for your engine, not just a general model family.
        </p>
        <Link href="/catalog" className="btn-secondary">
          Find my part
        </Link>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-6 text-xl font-bold">Recently added</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="rounded-lg border border-slate-200 p-4 transition hover:border-brand-blue"
              >
                <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md bg-slate-100">
                  {p.images[0] && (
                    <Image src={p.images[0]} alt={p.name} fill className="object-contain" />
                  )}
                </div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-brand-blue">{formatNaira(Number(p.price))}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
