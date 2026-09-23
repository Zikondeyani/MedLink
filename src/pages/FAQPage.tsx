import { useMemo, useState } from "react";
import { ChevronDown, Headset, Mail, MessageCircleQuestion, Phone, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { faqGroups, faqs, type FaqGroupId } from "../data/faqs";

export default function FAQPage() {
  const [activeGroup, setActiveGroup] = useState<FaqGroupId | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(faqs[0].q);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return faqs.filter((f) => {
      const inGroup = activeGroup === "all" || f.group === activeGroup;
      const inQuery =
        !term ||
        f.q.toLowerCase().includes(term) ||
        f.a.toLowerCase().includes(term);
      return inGroup && inQuery;
    });
  }, [activeGroup, query]);

  const countFor = (id: FaqGroupId | "all") =>
    id === "all" ? faqs.length : faqs.filter((f) => f.group === id).length;

  return (
    <div className="page faq-page">
      <div className="faq-hero">
        <div className="bg-grid-pattern" />
        <div className="container faq-hero-inner">
          <span className="eyebrow">Help centre</span>
          <h1 className="h-display" style={{ fontSize: "clamp(26px,4.5vw,40px)" }}>
            How can we help?
          </h1>
          <p className="muted">
            Answers to the most common questions about buying, delivery, payments and selling on MedLink.
          </p>
          <div className="faq-search card">
            <Search size={18} className="muted" />
            <input
              className="input-search"
              placeholder="Search questions — e.g. “delivery fee”, “KYC”, “10%”"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search FAQs"
            />
          </div>
        </div>
      </div>

      <div className="container faq-body">
        <div className="faq-chips no-scrollbar">
          <button
            className={`chip${activeGroup === "all" ? " chip-active" : ""}`}
            onClick={() => setActiveGroup("all")}
          >
            All questions <span className="faq-chip-count">{countFor("all")}</span>
          </button>
          {faqGroups.map((g) => (
            <button
              key={g.id}
              className={`chip${activeGroup === g.id ? " chip-active" : ""}`}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.label} <span className="faq-chip-count">{countFor(g.id)}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="card card-pad faq-empty">
            <MessageCircleQuestion size={34} className="muted" />
            <h3>No matching questions</h3>
            <p className="muted small">Try a different keyword, or contact our support team.</p>
          </div>
        ) : (
          <div className="faq-list">
            {visible.map((f) => {
              const isOpen = open === f.q;
              return (
                <div key={f.q} className={`faq-item card${isOpen ? " faq-open" : ""}`}>
                  <button
                    className="faq-q"
                    onClick={() => setOpen(isOpen ? null : f.q)}
                    aria-expanded={isOpen}
                  >
                    <span>{f.q}</span>
                    <ChevronDown size={18} className="faq-chev" />
                  </button>
                  <div className="faq-a-wrap" style={{ maxHeight: isOpen ? 400 : 0 }}>
                    <div className="faq-a">{f.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="faq-support card">
          <div className="row wrap" style={{ gap: 22, alignItems: "center" }}>
            <span className="faq-support-icon">
              <Headset size={22} />
            </span>
            <div className="grow">
              <h3 className="h-card">Still need help?</h3>
              <p className="small muted">
                Our support team is available Monday – Saturday, 8:00 – 17:00.
              </p>
              <div className="row wrap" style={{ gap: 16, marginTop: 8 }}>
                <span className="row" style={{ gap: 6 }}>
                  <Phone size={15} className="muted" /> +265 888 000 123
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <Mail size={15} className="muted" /> hello@medlink.mw
                </span>
              </div>
            </div>
            <Link to="/become-a-supplier" className="btn btn-outline btn-sm">
              Sell on MedLink
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}