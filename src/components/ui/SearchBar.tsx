import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({
  variant = "nav",
  initial = "",
  placeholder = "Search medical equipment...",
  autoFocus = false,
}: {
  variant?: "nav" | "hero" | "panel";
  initial?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <form className={`searchbar searchbar-${variant}`} onSubmit={submit} role="search">
      <Search size={variant === "hero" ? 20 : 17} strokeWidth={2} className="searchbar-icon" aria-hidden="true" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search products and suppliers"
      />
      <button type="submit" className="btn btn-teal btn-sm searchbar-btn">
        Search
      </button>
    </form>
  );
}