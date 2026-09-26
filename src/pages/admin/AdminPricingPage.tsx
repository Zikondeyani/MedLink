import { useEffect, useState } from "react";
import { MapPin, Percent, Plus, RotateCcw, Save, Trash2, Truck } from "lucide-react";
import { refreshMarketplace, updatePricingConfig, usePricing } from "../../lib/registry";
import { useToast } from "../../lib/toast";
import { mwk } from "../../lib/format";
import DashboardCard from "../../components/ui/DashboardCard";

interface CityDraft {
  city: string;
  fee: string;
}

/** 0.125 -> "12.5" (percent display) */
function rateToPct(rate: number): string {
  return String(Math.round(rate * 100 * 100) / 100);
}

/** "12.5" -> 0.125 (rate fraction) */
function pctToRate(pct: number): number {
  return pct / 100;
}

export default function AdminPricingPage() {
  const pricing = usePricing();
  const { push } = useToast();

  const [ratePct, setRatePct] = useState(() => rateToPct(pricing.serviceFeeRate));
  const [defaultFee, setDefaultFee] = useState(() => String(pricing.defaultDeliveryFee));
  const [cities, setCities] = useState<CityDraft[]>(() =>
    Object.entries(pricing.deliveryFees).map(([city, fee]) => ({ city, fee: String(fee) })),
  );

  /* Mirror the stored rates into the form: a save, a reload or another
     admin's edit all end up on screen as the source of truth. */
  useEffect(() => {
    setRatePct(rateToPct(pricing.serviceFeeRate));
    setDefaultFee(String(pricing.defaultDeliveryFee));
    setCities(Object.entries(pricing.deliveryFees).map(([city, fee]) => ({ city, fee: String(fee) })));
  }, [pricing]);

  const pct = Number(ratePct);
  const exampleFee = Number.isFinite(pct) ? Math.round(100_000 * pctToRate(Math.max(0, Math.min(100, pct)))) : 0;

  function patchCity(index: number, patch: Partial<CityDraft>): void {
    setCities((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function save(): Promise<void> {
    const pctNum = Number(ratePct);
    if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
      push({ title: "Invalid service fee", message: "Enter a percentage between 0 and 100.", icon: "error" });
      return;
    }
    const defaultNum = Number(defaultFee);
    if (!Number.isFinite(defaultNum) || defaultNum < 0) {
      push({ title: "Invalid delivery fee", message: "Default delivery fee must be 0 or more.", icon: "error" });
      return;
    }
    const deliveryFees: Record<string, number> = {};
    for (const c of cities) {
      const name = c.city.trim();
      if (!name) continue;
      const fee = Number(c.fee);
      if (!Number.isFinite(fee) || fee < 0) {
        push({ title: "Invalid city fee", message: `Fee for "${name}" must be 0 or more.`, icon: "error" });
        return;
      }
      deliveryFees[name] = Math.round(fee);
    }
    const result = await updatePricingConfig({
      serviceFeeRate: pctToRate(pctNum),
      defaultDeliveryFee: Math.round(defaultNum),
      deliveryFees,
    });
    if (!result.ok) {
      push({ title: "Pricing not saved", message: result.error ?? "The server rejected the change.", icon: "error" });
      return;
    }
    push({
      title: "Pricing updated",
      message: `${pctNum}% service fee and ${Object.keys(deliveryFees).length} city rates are now live.`,
      icon: "success",
    });
  }

  /** Discard local edits and re-read the rates the database actually holds. */
  async function reload(): Promise<void> {
    await refreshMarketplace();
    push({ title: "Reloaded", message: "The live rates from the database are shown again.", icon: "info" });
  }

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Platform settings</span>
          <h1 className="h-section">Pricing &amp; Charges</h1>
          <p className="small muted">
            Control MedLink's service fee and delivery fees. Changes apply instantly across the marketplace and checkout.
          </p>
        </div>
      </div>

      <div className="grid grid-4 dash-grid">
        <DashboardCard icon={<Percent size={19} />} label="Service fee" value={`${rateToPct(pricing.serviceFeeRate)}%`} sub="of product value" tone="teal" />
        <DashboardCard icon={<Truck size={19} />} label="Default delivery" value={mwk(pricing.defaultDeliveryFee)} sub="cities without a rate" tone="navy" />
        <DashboardCard icon={<MapPin size={19} />} label="City rates" value={String(Object.keys(pricing.deliveryFees).length)} sub="cities with custom fees" tone="amber" />
        <DashboardCard icon={<Save size={19} />} label="Fee on MWK 100k order" value={mwk(Math.round(100_000 * pricing.serviceFeeRate))} sub="service fee only" tone="green" />
      </div>

      <div className="card card-pad">
        <h3 className="h-card row" style={{ gap: 8, marginBottom: 16 }}>
          <Percent size={17} className="teal" /> Service fee
        </h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="feeRate">Service fee (%)</label>
            <div className="field-split" style={{ alignItems: "center" }}>
              <input
                id="feeRate"
                className="input"
                type="number"
                min={0}
                max={100}
                step={0.5}
                inputMode="decimal"
                value={ratePct}
                onChange={(e) => setRatePct(e.target.value)}
              />
              <span className="small muted">% of order value</span>
            </div>
            <p className="xs muted" style={{ marginTop: 8 }}>
              On a MWK 100,000 order MedLink keeps <strong className="ink">{mwk(exampleFee)}</strong>. Shown as a separate
              line at checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="between" style={{ marginBottom: 6 }}>
          <h3 className="h-card row" style={{ gap: 8 }}>
            <Truck size={17} className="teal" /> Delivery fees
          </h3>
          <button className="btn btn-outline btn-sm" onClick={() => setCities((prev) => [...prev, { city: "", fee: "" }])}>
            <Plus size={14} /> Add city
          </button>
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="defaultFee">Default delivery fee (MWK)</label>
            <input
              id="defaultFee"
              className="input"
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              value={defaultFee}
              onChange={(e) => setDefaultFee(e.target.value)}
            />
          </div>
        </div>

        {cities.length > 0 && (
          <div className="stack-sm" style={{ marginTop: 12 }}>
            {cities.map((c, i) => (
              <div key={i} className="row" style={{ gap: 10 }}>
                <div className="field grow">
                  <label className="label" htmlFor={`city-${i}`}>City</label>
                  <input
                    id={`city-${i}`}
                    className="input"
                    placeholder="e.g. Lilongwe"
                    value={c.city}
                    onChange={(e) => patchCity(i, { city: e.target.value })}
                  />
                </div>
                <div className="field" style={{ width: 200 }}>
                  <label className="label" htmlFor={`city-fee-${i}`}>Fee (MWK)</label>
                  <input
                    id={`city-fee-${i}`}
                    className="input"
                    type="number"
                    min={0}
                    step={500}
                    inputMode="numeric"
                    placeholder="5000"
                    value={c.fee}
                    onChange={(e) => patchCity(i, { fee: e.target.value })}
                  />
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ alignSelf: "center", color: "var(--red)" }}
                  aria-label={`Remove ${c.city || "city"}`}
                  onClick={() => setCities((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {cities.length === 0 && (
          <p className="xs muted" style={{ marginTop: 10 }}>
            No city rates yet — every city uses the default delivery fee above.
          </p>
        )}
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-primary btn-lg" onClick={() => void save()}>
          <Save size={16} /> Save pricing
        </button>
        <button className="btn btn-ghost" onClick={() => void reload()}>
          <RotateCcw size={16} /> Reload from server
        </button>
      </div>
    </div>
  );
}