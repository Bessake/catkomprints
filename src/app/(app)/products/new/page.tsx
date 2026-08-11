import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/product-form";

export const metadata = {
  title: "New product",
};

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>New product</h1>
        </div>
        <Link href="/products" className="button secondary">
          Back
        </Link>
      </div>
      <section className="panel">
        <ProductForm categories={categories} />
      </section>
    </>
  );
}
