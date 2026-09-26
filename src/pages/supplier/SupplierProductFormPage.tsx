import { useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addProduct, productById, updateProduct, useCategories } from "../../lib/registry";
import type { ProductSpec, ProductStatus } from "../../data/types";
import { useToast } from "../../lib/toast";
import { hashString } from "../../lib/format";
import { uploadFile, useUploadOwner } from "../../lib/cloudinary";

/** One tile in the product image grid — either uploading or holding a Cloudinary URL. */
type ImageSlot = {
  key: string;
  name: string;
  url?: string;
  publicId?: string;
  uploading: boolean;
};

export default function SupplierProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = id ? productById(id) : undefined;
  const categories = useCategories();
  const navigate = useNavigate();
  const { push } = useToast();
  // Product photos always land in this supplier's own folder.
  const owner = useUploadOwner();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    categoryId: string;
    description: string;
    price: string;
    stock: string;
    brand: string;
    model: string;
    sku: string;
    warranty: string;
    unit: string;
    status: ProductStatus;
  }>({
    name: editing?.name ?? "",
    categoryId: editing?.categoryId ?? categories[0]?.id ?? "",
    description: editing?.description ?? "",
    price: editing ? String(editing.price) : "",
    stock: editing ? String(editing.stock) : "50",
    brand: editing?.brand ?? "",
    model: editing?.model ?? "",
    sku: editing?.sku ?? "",
    warranty: editing?.warranty ?? "1 Year",
    unit: editing?.unit ?? "unit",
    status: editing?.status ?? "active",
  });
  const [specs, setSpecs] = useState<ProductSpec[]>(
    editing?.specs ?? [
      { label: "Brand", value: "" },
      { label: "Model", value: "" },
      { label: "Warranty", value: "1 Year" },
    ],
  );

  // Photos already stored for this product, plus whatever is uploading now.
  const [images, setImages] = useState<ImageSlot[]>(() =>
    (editing?.images ?? []).map((url, i) => ({
      key: `stored-${i}`,
      name: `Photo ${i + 1}`,
      url,
      uploading: false,
    })),
  );

  /** Upload selected pictures to Cloudinary; only their URLs are kept. */
  async function handleFiles(list: FileList | null): Promise<void> {
    if (!list) return;
    const files = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, 4 - images.length));
    if (!files.length) return;

    const stamp = Date.now();
    const keys = files.map((_, i) => `img-${stamp}-${i}`);
    setImages((prev) => [...prev, ...files.map((file, i) => ({ key: keys[i], name: file.name, uploading: true }))]);

    await Promise.all(
      files.map(async (file, i) => {
        // Streams from disk into this supplier's own folder — never base64.
        const result = await uploadFile(file, { purpose: "products", owner });
        if (result.ok) {
          setImages((prev) =>
            prev.map((s) =>
              s.key === keys[i] ? { ...s, url: result.file.url, publicId: result.file.publicId, uploading: false } : s,
            ),
          );
          return;
        }
        // Free the tile again — the toast explains what went wrong.
        setImages((prev) => prev.filter((s) => s.key !== keys[i]));
        push({
          title: result.notConfigured ? "Uploads unavailable" : "Upload failed",
          message: result.notConfigured ? result.error : `${file.name} — ${result.error}`,
          icon: result.notConfigured ? "info" : "error",
        });
      }),
    );
  }

  /**
   * Write the product for real. Only the URL of each uploaded photo is stored —
   * the file itself stays in this supplier's Cloudinary folder.
   */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const urls = images.filter((img) => img.url && !img.uploading).map((img) => img.url as string);
    const input = {
      name: form.name,
      categoryId: form.categoryId,
      description: form.description,
      price: Number(form.price),
      unit: form.unit,
      stock: Number(form.stock),
      brand: form.brand,
      model: form.model,
      sku: form.sku,
      specs: specs.filter((spec) => spec.label.trim() || spec.value.trim()),
      warranty: form.warranty,
      status: form.status,
      image: urls[0],
      images: urls,
    };

    if (!Number.isFinite(input.price) || input.price < 0) {
      push({ title: "Check the price", message: "Enter a price of 0 or more.", icon: "error" });
      return;
    }
    if (!Number.isFinite(input.stock) || input.stock < 0) {
      push({ title: "Check the stock", message: "Enter a stock quantity of 0 or more.", icon: "error" });
      return;
    }

    setSaving(true);
    const result = editing
      ? await updateProduct(editing.id, input)
      : await addProduct(input);
    setSaving(false);

    if (!result.ok) {
      push({ title: editing ? "Not saved" : "Product not created", message: result.error ?? "The server rejected the change.", icon: "error" });
      return;
    }

    const uploaded = urls.length;
    push({
      title: editing ? "Product updated" : "Product created",
      message:
        `${form.name || "Your product"} was ${editing ? "updated" : "added to your store"}` +
        (uploaded ? ` · ${uploaded} image${uploaded === 1 ? "" : "s"} stored on Cloudinary` : "") +
        ".",
      icon: "success",
    });
    navigate("/supplier/products");
  };

  const specKey = (label: string) => label.trim() || `spec-${hashString(String(specs.length))}`;

  return (
    <div className="stack form-page">
      <Link to="/supplier/products" className="link-muted xs row" style={{ gap: 6 }}>
        <ArrowLeft size={14} /> Back to products
      </Link>

      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Catalog</span>
          <h1 className="h-section">{editing ? "Edit product" : "Add product"}</h1>
          <p className="small muted">
            {editing ? `Editing ${editing.name}.` : "Create a new product for your MedLink store."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="stack">
        <div className="card card-pad">
          <h3 className="h-card" style={{ marginBottom: 16 }}>Product details</h3>
          <div className="form-grid">
            <div className="field full">
              <label className="label" htmlFor="fname">Product name</label>
              <input id="fname" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Digital Blood Pressure Monitor" />
            </div>
            <div className="field">
              <label className="label" htmlFor="fcat">Category</label>
              <select id="fcat" className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="fstatus">Status</label>
              <select id="fstatus" className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="field full">
              <label className="label" htmlFor="fdesc">Description</label>
              <textarea id="fdesc" className="textarea" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the product, its use and key features..." />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-card" style={{ marginBottom: 16 }}>Pricing & inventory</h3>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="fprice">Price (MWK)</label>
              <input id="fprice" className="input" type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="85000" />
            </div>
            <div className="field">
              <label className="label" htmlFor="fstock">Stock quantity</label>
              <input id="fstock" className="input" type="number" min={0} required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="fsku">SKU</label>
              <input id="fsku" className="input" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="ME-BPM-003" />
            </div>
            <div className="field">
              <label className="label" htmlFor="funit">Unit of sale</label>
              <select id="funit" className="select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="unit">Per unit</option>
                <option value="box">Per box</option>
                <option value="pack">Per pack</option>
                <option value="pair">Per pair</option>
                <option value="kit">Per kit</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-card" style={{ marginBottom: 16 }}>Brand & model</h3>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="fbrand">Brand</label>
              <input id="fbrand" className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Omron" />
            </div>
            <div className="field">
              <label className="label" htmlFor="fmodel">Model</label>
              <input id="fmodel" className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="M3 Comfort" />
            </div>
            <div className="field">
              <label className="label" htmlFor="fwarranty">Warranty</label>
              <select id="fwarranty" className="select" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })}>
                <option>None</option>
                <option>6 Months</option>
                <option>1 Year</option>
                <option>2 Years</option>
                <option>5 Years</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="fspec-unit">Display unit</label>
              <input id="fspec-unit" className="input" defaultValue="unit" placeholder="unit, box, kit" />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-card" style={{ marginBottom: 16 }}>Product images</h3>
          <div className="upload-grid">
            {[0, 1, 2, 3].map((i) => {
              const img = images[i];
              if (!img) {
                return (
                  <label key={i} className="upload-tile">
                    <input
                      type="file"
                      accept="image/*"
                      className="doc-file-input"
                      onChange={(e) => {
                        void handleFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <ImagePlus size={20} className="muted" />
                    <span className="xs muted">Add image</span>
                  </label>
                );
              }
              return (
                <div key={img.key} className="upload-tile filled">
                  {!img.uploading && (
                    <button
                      type="button"
                      className="upload-tile-remove"
                      aria-label={`Remove ${img.name}`}
                      onClick={() => setImages((prev) => prev.filter((s) => s.key !== img.key))}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {img.uploading ? (
                    <span className="xs upload-tile-name row" style={{ gap: 6, justifyContent: "center" }}>
                      <Loader2 size={14} className="spin" /> Uploading…
                    </span>
                  ) : img.url ? (
                    <img src={img.url} alt={img.name} />
                  ) : (
                    <span className="xs upload-tile-name">{img.name}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="xs muted" style={{ marginTop: 10 }}>
            Add up to 4 product images (10 MB each, stored on Cloudinary). The first image is the cover.
          </p>
        </div>

        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 16 }}>
            <h3 className="h-card">Specifications</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSpecs([...specs, { label: "", value: "" }])}>
              <Plus size={14} /> Add spec
            </button>
          </div>
          <div className="stack-sm">
            {specs.map((s, i) => (
              <div key={specKey(s.label) + i} className="spec-editor">
                <input
                  className="input"
                  placeholder="Label (e.g. Measurement)"
                  value={s.label}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="input"
                  placeholder="Value (e.g. Upper arm)"
                  value={s.value}
                  onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Remove spec"
                  onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Link to="/supplier/products" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}