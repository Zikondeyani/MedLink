import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCategories, addCategory, updateCategory, removeCategory } from "../../lib/registry";
import { useToast } from "../../lib/toast";
import Modal from "../../components/ui/Modal";
import { CategoryIcon, categoryIcons } from "../../components/ui/Icon";

const iconOptions = Object.keys(categoryIcons);

interface Draft {
  name: string;
  description: string;
  icon: string;
}

const emptyDraft: Draft = { name: "", description: "", icon: "package" };

export default function AdminCategoriesPage() {
  const categories = useCategories();
  const { push } = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const open = editingId !== null;

  function startNew(): void {
    setDraft(emptyDraft);
    setEditingId("new");
  }

  function startEdit(id: string): void {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setDraft({ name: c.name, description: c.description, icon: c.icon });
    setEditingId(id);
  }

  function save(): void {
    if (!draft.name.trim() || !draft.description.trim()) {
      push({ title: "Missing fields", message: "Name and description are required.", icon: "error" });
      return;
    }
    if (editingId === "new") {
      addCategory({ name: draft.name, description: draft.description, icon: draft.icon });
      push({ title: "Category added", message: `${draft.name} is live on the marketplace.`, icon: "success" });
    } else if (editingId) {
      updateCategory(editingId, { name: draft.name, description: draft.description, icon: draft.icon });
      push({ title: "Category updated", message: draft.name, icon: "success" });
    }
    setEditingId(null);
  }

  function remove(id: string, name: string): void {
    removeCategory(id);
    push({ title: "Category removed", message: name, icon: "info" });
  }

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1 className="h-section">Categories</h1>
          <p className="small muted">{categories.length} departments shoppers can browse.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={startNew}>
          <Plus size={15} /> Add category
        </button>
      </div>

      <div className="grid grid-3">
        {categories.map((c) => (
          <div key={c.id} className="card card-pad admin-cat-card">
            <div className="row" style={{ gap: 12 }}>
              <span className="cat-icon" style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}>
                <CategoryIcon name={c.icon} size={22} strokeWidth={1.8} />
              </span>
              <div className="grow">
                <b className="small">{c.name}</b>
                <div className="xs muted">{c.productCount} products · /categories/{c.slug}</div>
              </div>
            </div>
            <p className="xs muted" style={{ marginTop: 10, lineHeight: 1.55 }}>{c.description}</p>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" onClick={() => startEdit(c.id)}>
                <Pencil size={13} /> Edit
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--red)" }}
                onClick={() => remove(c.id, c.name)}
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setEditingId(null)}
        title={editingId === "new" ? "Add category" : "Edit category"}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditingId(null)}>
              <X size={15} /> Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              {editingId === "new" ? <Plus size={15} /> : <Pencil size={15} />} Save category
            </button>
          </>
        }
      >
        <div className="stack">
          <label className="field">
            <span>Category name *</span>
            <input className="input" placeholder="e.g. Radiology & Imaging" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Description *</span>
            <textarea className="input textarea" rows={2} placeholder="Short description shown to shoppers"
              value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </label>
          <div className="field">
            <span>Icon</span>
            <div className="row wrap" style={{ gap: 8 }}>
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-pick${draft.icon === icon ? " icon-pick-active" : ""}`}
                  onClick={() => setDraft((d) => ({ ...d, icon }))}
                  title={icon}
                >
                  <CategoryIcon name={icon} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}