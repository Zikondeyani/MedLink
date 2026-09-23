import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { faqGroups, faqs, type FaqGroupId } from "../../data/faqs";

const PREVIEW_COUNT = 4;

export default function HomeFaq() {
  const [group, setGroup] = useState<FaqGroupId>("general");
  const [open, setOpen] = useState<string | null>(null);

  const items = faqs.filter((f) => f.group === group).slice(0, PREVIEW_COUNT);

  return (
    <section className="section section-alt container-fluid home-faq">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Help centre</span>
            <h2 className="h-section">Frequently Asked Questions</h2>
            <p>Quick answers for buyers and suppliers — browse by topic.</p>
          </div>
          <Link to="/faq" className="btn btn-outline btn-sm hide-mobile">
            View all FAQs <ArrowRight size={14} />
          </Link>
        </div>

        {/* Horizontal pill navigation (same style as categories) */}
        <div className="cat-pills no-scrollbar" role="tablist" aria-label="FAQ topics">
          {faqGroups.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={group === g.id}
              className={`cat-pill${group === g.id ? " cat-pill-active" : ""}`}
              onClick={() => {
                setGroup(g.id);
                setOpen(null);
              }}
            >
              {g.label}
              <span className="cat-pill-count">{faqs.filter((f) => f.group === g.id).length}</span>
            </button>
          ))}
        </div>

        <div className="faq-list home-faq-list">
          {items.map((f) => {
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

        <div className="home-faq-more">
          <Link to="/faq" className="btn btn-primary btn-block">
            View all FAQs <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}