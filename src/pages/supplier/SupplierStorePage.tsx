import { BadgeCheck, Camera, Globe, MapPin, Phone, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { currentSupplierId, supplierById } from "../../data/suppliers";
import { useToast } from "../../lib/toast";
import { SupplierAvatar } from "../../components/marketplace/SupplierCard";

export default function SupplierStorePage() {
  const supplier = supplierById(currentSupplierId);
  const { push } = useToast();
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    description: supplier?.description ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    city: supplier?.location.city ?? "Lilongwe",
    area: supplier?.location.area ?? "Area 3",
    registration: "MED-REG-2023-00451",
    deliveryFee: String(supplier?.delivery.fee ?? 5000),
    estimate: supplier?.delivery.estimate ?? "1–2 days",
  });

  if (!supplier) return null;

  const save = () => {
    push({ title: "Store updated", message: "Your store information has been saved.", icon: "success" });
  };

  return (
    <div className="stack">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Storefront</span>
          <h1 className="h-section">Store</h1>
          <p className="small muted">Manage how your store appears to customers on the marketplace.</p>
        </div>
        <span className="badge badge-green"><BadgeCheck size={13} /> Verified Supplier</span>
      </div>

      {/* Banner + logo */}
      <div className="store-preview">
        <div className="store-preview-banner" style={{ background: `linear-gradient(120deg, ${supplier.bannerGradient[0]}, ${supplier.bannerGradient[1]})` }}>
          <div className="bg-grid-pattern" />
          <div className="store-preview-actions">
            <button className="btn btn-outline btn-sm"><Camera size={14} /> Upload banner</button>
          </div>
        </div>
        <div className="store-preview-head">
          <SupplierAvatar supplier={supplier} size={68} />
          <div className="grow">
            <h2 className="h-card">{supplier.name}</h2>
            <span className="badge badge-green" style={{ marginTop: 2 }}><BadgeCheck size={11} /> Verified Supplier</span>
          </div>
          <button className="btn btn-outline btn-sm"><Camera size={14} /> Change logo</button>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-card" style={{ marginBottom: 16 }}>Store information</h3>
        <div className="form-grid">
          <div className="field full">
            <label className="label" htmlFor="sname">Store name</label>
            <input id="sname" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="sdesc">Description</label>
            <textarea id="sdesc" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="sphone"><Phone size={13} className="muted" /> Phone</label>
            <input id="sphone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="semail"><Globe size={13} className="muted" /> Email</label>
            <input id="semail" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="scity"><MapPin size={13} className="muted" /> City</label>
            <select id="scity" className="select" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              <option>Lilongwe</option><option>Blantyre</option><option>Mzuzu</option><option>Zomba</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="sarea">Area / Zone</label>
            <input id="sarea" className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-card" style={{ marginBottom: 16 }}>Business registration</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="sreg">Registration number</label>
            <input id="sreg" className="input" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="srtype">Business type</label>
            <select id="srtype" className="select" defaultValue="Limited Company">
              <option>Limited Company</option>
              <option>Sole Proprietor</option>
              <option>Partnership</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm"><Upload size={14} /> Upload certificate</button>
          <span className="xs muted">medreg_certificate_2023.pdf · verified</span>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-card" style={{ marginBottom: 16 }}>Delivery information</h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="dfee">Delivery fee (MWK)</label>
            <input id="dfee" className="input" type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="dest">Estimated delivery</label>
            <input id="dest" className="input" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="dpickup">MedLink pickup window</label>
            <select id="dpickup" className="select" defaultValue="09:00 – 16:00">
              <option>08:00 – 15:00</option>
              <option>09:00 – 16:00</option>
              <option>10:00 – 17:00</option>
            </select>
          </div>
        </div>
        <p className="xs muted" style={{ marginTop: 10 }}>
          MedLink collects orders from your store and handles all customer delivery. Customers pay a 10% MedLink
          service fee plus a delivery fee on every order — there are no free delivery thresholds.
        </p>
      </div>

      <div className="card card-pad row between">
        <div>
          <h3 className="h-card">Danger zone</h3>
          <p className="xs muted">Temporarily close your store or remove it from the marketplace.</p>
        </div>
        <button className="btn btn-danger" onClick={() => push({ title: "Store actions", message: "Store visibility settings can be changed here.", icon: "info" })}>
          <Trash2 size={15} /> Close store
        </button>
      </div>

      <button className="btn btn-primary btn-lg" style={{ alignSelf: "flex-end" }} onClick={save}>
        Save store changes
      </button>
    </div>
  );
}