import { deleteCategoryAction } from "@/app/actions";
import { CategoryForm } from "@/components/category-form";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Categories",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Organize</p>
          <h1>Categories</h1>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>All categories</h2>
          {categories.length === 0 ? (
            <p className="muted">No categories yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Products</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const deleteAction = deleteCategoryAction.bind(
                      null,
                      category.id,
                    );
                    return (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{category._count.products}</td>
                        <td>
                          <form action={deleteAction}>
                            <button type="submit" className="button danger">
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Add category</h2>
          <CategoryForm />
        </section>
      </div>
    </>
  );
}
