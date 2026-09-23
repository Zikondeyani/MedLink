import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategoryBySlug } from "../lib/registry";
import { activeProducts, productsByCategory } from "../data/products";
import ProductGrid from "../components/marketplace/ProductGrid";
import EmptyState from "../components/ui/EmptyState";
import { CategoryIcon } from "../components/ui/Icon";
import { ArrowRight } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = getCategoryBySlug(slug ?? "");

  const pageProducts = useMemo(() => (category ? productsByCategory(category.id) : []), [category]);
  const related = useMemo(
    () =>
      category
        ? activeProducts
            .filter((p) => p.categoryId !== category.id && (p.popular || p.isNew))
            .slice(0, 4)
        : [],
    [category],
  );

  if (!category) {
    return (
      <div className="container page">
        <EmptyState
          icon="search"
          title="Category not found"
          message="This category may have been renamed or removed."
          action={<Link to="/products" className="btn btn-primary">Browse all products</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page category-page">
      <div className="category-hero" style={{ background: `linear-gradient(115deg, ${category.gradient[0]}, ${category.gradient[1]})` }}>
        <div className="bg-grid-pattern" />
        <div className="container category-hero-inner">
          <span className="category-hero-icon">
            <CategoryIcon name={category.icon} size={26} />
          </span>
          <div className="grow">
            <span className="eyebrow" style={{ color: "#FFD28A" }}>Category</span>
            <h1 className="category-hero-title">{category.name}</h1>
            <p className="small" style={{ opacity: 0.85, maxWidth: 560 }}>{category.description}</p>
          </div>
          <span className="badge badge-navy">{pageProducts.length} products</span>
        </div>
      </div>

      <div className="container" style={{ marginTop: 32 }}>
        {pageProducts.length === 0 ? (
          <EmptyState
            icon="box"
            title="No products in this category yet"
            message="Suppliers are adding stock. Check back soon or browse everything available."
            action={<Link to="/products" className="btn btn-primary">Browse all products</Link>}
          />
        ) : (
          <ProductGrid products={pageProducts} cols={3} />
        )}
      </div>

      {related.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <span className="eyebrow">You may also need</span>
              <h2 className="h-section">Popular in other categories</h2>
            </div>
            <Link to="/products" className="btn btn-outline btn-sm hide-mobile">
              All products <ArrowRight size={14} />
            </Link>
          </div>
          <ProductGrid products={related} cols={4} />
        </section>
      )}
    </div>
  );
}