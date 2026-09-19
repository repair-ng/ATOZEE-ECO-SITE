import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delivery rates — Lagos/Ogun as a starting point per the project doc;
  // add the rest of the 36 states + FCT via /admin/delivery once real
  // pricing is confirmed.
  await prisma.deliveryRate.upsert({
    where: { state: "Lagos" },
    update: { price: 5000 },
    create: { state: "Lagos", price: 5000 },
  });
  await prisma.deliveryRate.upsert({
    where: { state: "Ogun" },
    update: { price: 7500 },
    create: { state: "Ogun", price: 7500 },
  });

  // A handful of sample products so the catalog isn't empty locally.
  const products = [
    {
      name: "Cylinder Head Gasket",
      slug: "cylinder-head-gasket-yc6108",
      partNumber: "YC6108-GSK-01",
      category: "Gaskets",
      description: "OEM-spec cylinder head gasket for YC6108 series engines.",
      price: 45000,
      inStock: true,
      images: [],
      engineNumbers: ["YC6108ZLQ-123456", "YC6108ZLQ-123789"],
    },
    {
      name: "Fuel Injector Assembly",
      slug: "fuel-injector-yc6112",
      partNumber: "YC6112-INJ-04",
      category: "Fuel System",
      description: "Replacement fuel injector for YC6112 series engines.",
      price: 128000,
      inStock: false,
      images: [],
      engineNumbers: ["YC6112ZLQ-556677"],
    },
    {
      name: "Water Pump",
      slug: "water-pump-yc6108",
      partNumber: "YC6108-WP-02",
      category: "Cooling",
      description: "Direct-fit water pump for YC6108 series engines.",
      price: 62000,
      inStock: true,
      images: [],
      engineNumbers: ["YC6108ZLQ-123456"],
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
