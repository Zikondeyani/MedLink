import { useState } from "react";
import { Bell, KeyRound, Truck } from "lucide-react";
import { useToast } from "../../lib/toast";

export default function SupplierSettingsPage() {
  const { push } = useToast();
  const [prefs, setPrefs] = useState({
    smsOrder: true,
    emailOrder: true,
    pickupReminder: true,
    lowStockAlerts: true,
    weeklyReport: false,
  });

  const save = () => {
    push({ title: "Settings saved", message: "Your store preferences have been updated.", icon: "success" });
  };

  const toggles: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "smsOrder", label: "SMS on new orders", desc: "Get an SMS the moment an order arrives." },
    { key: "emailOrder", label: "Email order summaries", desc: "Daily summary of received orders." },
    { key: "pickupReminder", label: "MedLink pickup reminders", desc: "Alerts before MedLink collects orders." },
    { key: "lowStockAlerts", label: "Low stock alerts", desc: "Notify when a product drops below 10 units." },
    { key: "weeklyReport", label: "Weekly performance report", desc: "A weekly sales and orders digest." },
  ];

  return (
    <div className="stack">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Preferences</span>
          <h1 className="h-section">Store Settings</h1>
          <p className="small muted">Notifications, security and delivery preferences for your store account.</p>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-card row" style={{ gap: 8, marginBottom: 16 }}>
          <Bell size={17} className="teal" /> Notifications
        </h3>
        <div className="stack-sm">
          {toggles.map((t) => (
            <div key={t.key} className="between settings-row">
              <div>
                <b className="small">{t.label}</b>
                <div className="xs muted">{t.desc}</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={prefs[t.key]}
                  onChange={(e) => setPrefs({ ...prefs, [t.key]: e.target.checked })}
                />
                <span className="switch-track" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-card row" style={{ gap: 8, marginBottom: 16 }}>
          <Truck size={17} className="teal" /> Delivery preferences
        </h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="pickupWin">Preferred pickup window</label>
            <select id="pickupWin" className="select" defaultValue="09:00 – 16:00">
              <option>08:00 – 15:00</option>
              <option>09:00 – 16:00</option>
              <option>10:00 – 17:00</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="boxLoc">Pickup location</label>
            <input id="boxLoc" className="input" defaultValue="Area 3 Warehouse, Lilongwe" />
          </div>
        </div>
        <p className="xs muted" style={{ marginTop: 10 }}>
          MedLink couriers use these details when collecting orders from your store.
        </p>
      </div>

      <div className="card card-pad">
        <h3 className="h-card row" style={{ gap: 8, marginBottom: 16 }}>
          <KeyRound size={17} className="teal" /> Security
        </h3>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="pass">New password</label>
            <input id="pass" className="input" type="password" placeholder="••••••••" />
          </div>
          <div className="field">
            <label className="label" htmlFor="pass2">Confirm password</label>
            <input id="pass2" className="input" type="password" placeholder="••••••••" />
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>Update password</button>
      </div>

      <button className="btn btn-primary btn-lg" style={{ alignSelf: "flex-end" }} onClick={save}>
        Save settings
      </button>
    </div>
  );
}