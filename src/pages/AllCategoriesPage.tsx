import { Link } from "react-router-dom";
import { useCategories } from "../lib/registry";
import { CategoryIcon } from "../components/ui/Icon";

export default function AllCategoriesPage() {
  const categories = useCategories();
  return (
    <div className="page container">
      <div className="page-head">
        <span className="eyebrow">Departments</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>All Categories</h1>
        <p className="muted">Browse the full range of medical products available on MedLink.</p>
      </div>
      <div className="grid grid-3">
        {categories.map((c) => (
          <Link key={c.id} to={`/categories/${c.slug}`} className="card card-hover category-big">
            <span className="cat-icon" style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}>
              <CategoryIcon name={c.icon} size={26} strokeWidth={1.8} />
            </span>
            <div className="grow">
              <b>{c.name}</b>
              <div className="xs muted">{c.productCount} products</div>
            </div>
            <span className="muted">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}