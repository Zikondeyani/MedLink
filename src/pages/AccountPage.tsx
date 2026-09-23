import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { customerOrders, customerProfile, savedAddresses } from "../data/orders";
import { activeProducts } from "../data/products";
import { suppliers } from "../data/suppliers";
import { mwk } from "../lib/format";
import { useWishlist } from "../lib/wishlist";
import { useNotifications } from "../lib/notifications";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import ProductCard from "../components/marketplace/ProductCard";
import SupplierCard from "../components/marketplace/SupplierCard";
import { CustomerOrderStatusBadge } from "../components/marketplace/OrderStatus";

type Tab = "overview" | "orders" | "cart" | "saved" | "addresses" | "profile" | "settings" | "notifications";

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "orders", label: "My Orders", icon: Package },
  { id: "cart", label: "Cart", icon: ShoppingCart },
  { id: "saved", label: "Saved Products", icon: Heart },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function AccountPage() {
  const [params, setParams] = useSearchParams();
  const active = (params.get("tab") as Tab | null) ?? "overview";
  const { ids } = useWishlist();
  const { items, markRead, markAllRead } = useNotifications();
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

  const savedProducts = useMemo(() => ids.map((id) => activeProducts.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p)), [ids]);
  const delivered = customerOrders.filter((o) => o.status === "delivered").length;
  const pending = customerOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
  const totalSpent = customerOrders.filter((o) => o.status === "delivered").reduce((a, o) => a + o.total, 0);
  const recommended = activeProducts.filter((p) => p.popular).slice(0, 4);
  const favSuppliers = [...suppliers].sort((a, b) => b.rating - a.rating).slice(0, 2);
  const visibleNotifs = items.filter((n) => (notifFilter === "unread" ? !n.read : true));

  const setTab = (t: Tab) =>
    setParams(t === "overview" ? {} : { tab: t }, { replace: true });

  return (
    <div className="page account-page container">
      <div className="page-head">
        <span className="eyebrow">My account</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>Hello, {customerProfile.name.split(" ")[0]} 👋</h1>
        <p className="muted">{customerProfile.email} · {customerProfile.role}</p>
      </div>

      <div className="split">
        {/* Sidebar */}
        <aside className="acct-nav card">
          {tabs.map((t) => (
            <button key={t.id} className={`acct-nav-item${active === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              <t.icon size={17} strokeWidth={1.9} />
              {t.label}
              {t.id === "notifications" && items.filter((n) => !n.read).length > 0 && (
                <span className="snav-count">{items.filter((n) => !n.read).length}</span>
              )}
            </button>
          ))}
          <div className="acct-nav-foot">
            <button className="acct-nav-item"><LogOut size={17} /> Sign out</button>
          </div>
        </aside>

        {/* Content */}
        <div>
          {/* ---------- Overview ---------- */}
          {active === "overview" && (
            <div className="stack">
              <div className="grid grid-4 dash-grid">
                <DashboardCard icon={<Package size={19} />} label="Total Orders" value={String(customerOrders.length)} sub="All time" tone="navy" />
                <DashboardCard icon={<Clock size={19} />} label="Pending Orders" value={String(pending)} sub="In progress" tone="teal" />
                <DashboardCard icon={<CheckCircle2 size={19} />} label="Delivered" value={String(delivered)} sub="Completed" tone="green" />
                <DashboardCard icon={<Wallet size={19} />} label="Total Spent" value={mwk(totalSpent)} sub="Across orders" tone="amber" />
              </div>

              <div className="card card-pad">
                <div className="between" style={{ marginBottom: 14 }}>
                  <h2 className="h-card">Recent orders</h2>
                  <Link to="/orders" className="link small">View all</Link>
                </div>
                <div className="stack-sm">
                  {customerOrders.slice(0, 3).map((o) => (
                    <Link to={`/orders/${o.id}`} key={o.id} className="review-line recent-order">
                      <div className="grow">
                        <div className="between">
                          <b className="small">{o.number}</b>
                          <CustomerOrderStatusBadge status={o.status} />
                        </div>
                        <div className="xs muted">{o.lines.reduce((a, l) => a + l.quantity, 0)} items · {o.lines[0]?.supplierName}</div>
                      </div>
                      <b className="small">{mwk(o.total)}</b>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <h2 className="h-card" style={{ marginBottom: 14 }}>Recommended for you</h2>
                <div className="grid grid-auto">
                  {recommended.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <h2 className="h-card" style={{ marginBottom: 14 }}>Favorite suppliers</h2>
                <div className="grid grid-2">
                  {favSuppliers.map((s) => (
                    <SupplierCard key={s.id} supplier={s} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- Orders ---------- */}
          {active === "orders" && (
            <div className="stack">
              {customerOrders.map((o) => (
                <Link to={`/orders/${o.id}`} key={o.id} className="card card-hover order-card-mini">
                  <div className="grow">
                    <div className="row" style={{ gap: 10 }}>
                      <b className="small">{o.number}</b>
                      <CustomerOrderStatusBadge status={o.status} />
                    </div>
                    <div className="xs muted" style={{ marginTop: 4 }}>
                      {o.lines.reduce((a, l) => a + l.quantity, 0)} items · {o.estimatedDelivery}
                    </div>
                  </div>
                  <b>{mwk(o.total)}</b>
                </Link>
              ))}
            </div>
          )}

          {/* ---------- Cart ---------- */}
          {active === "cart" && (
            <div className="card card-pad">
              <h2 className="h-card" style={{ marginBottom: 12 }}>Your cart</h2>
              <p className="small muted">
                Manage your cart from the dedicated page. Head over to continue shopping.
              </p>
              <Link to="/cart" className="btn btn-primary" style={{ marginTop: 14 }}>
                <ShoppingCart size={16} /> Open cart
              </Link>
            </div>
          )}

          {/* ---------- Saved ---------- */}
          {active === "saved" && (
            savedProducts.length === 0 ? (
              <EmptyState
                icon="box"
                title="No saved products"
                message="Tap the heart on any product to save it here."
                action={<Link to="/products" className="btn btn-primary">Discover products</Link>}
              />
            ) : (
              <div className="grid grid-auto">
                {savedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )
          )}

          {/* ---------- Addresses ---------- */}
          {active === "addresses" && (
            <div className="grid grid-2 addr-grid">
              {savedAddresses.map((a) => (
                <div key={a.label} className="card card-pad">
                  <div className="between">
                    <span className="badge badge-soft">{a.label}</span>
                    {a.isDefault && <span className="badge badge-green">Default</span>}
                  </div>
                  <b className="small" style={{ display: "block", marginTop: 12 }}>{a.fullName}</b>
                  <p className="small muted">{a.address}</p>
                  <p className="small muted">{a.area}, {a.city}</p>
                  <p className="xs muted">{a.phone}</p>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn btn-outline btn-sm"><Plus size={13} /> Edit</button>
                    <button className="btn btn-ghost btn-sm"><Trash2 size={13} /> Remove</button>
                  </div>
                </div>
              ))}
              <button className="card card-hover addr-add">
                <span className="addr-add-icon"><Plus size={22} /></span>
                <b className="small">Add a new address</b>
                <span className="xs muted">Clinic, hospital, home...</span>
              </button>
            </div>
          )}

          {/* ---------- Profile ---------- */}
          {active === "profile" && (
            <div className="card card-pad">
              <h2 className="h-card" style={{ marginBottom: 16 }}>Profile</h2>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="pname">Full name</label>
                  <input id="pname" className="input" defaultValue={customerProfile.name} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="pemail">Email</label>
                  <input id="pemail" className="input" defaultValue={customerProfile.email} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="pphone">Phone</label>
                  <input id="pphone" className="input" defaultValue={customerProfile.phone} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="porg">Organisation</label>
                  <input id="porg" className="input" defaultValue={customerProfile.role} />
                </div>
                <div className="field full">
                  <label className="label" htmlFor="pabout">About</label>
                  <textarea id="pabout" className="textarea" defaultValue="Clinical founder purchasing supplies for BandaCare Clinic. Prefers morning deliveries." />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16 }}>Save changes</button>
            </div>
          )}

          {/* ---------- Settings ---------- */}
          {active === "settings" && (
            <div className="card card-pad">
              <h2 className="h-card" style={{ marginBottom: 16 }}>Settings</h2>
              <div className="stack-sm">
                {[
                  { label: "Email order updates", desc: "Receive order confirmations and status changes by email." },
                  { label: "SMS delivery alerts", desc: "Get SMS alerts when your order is out for delivery." },
                  { label: "Price drop notifications", desc: "Notify me when saved products change price." },
                  { label: "Marketing newsletters", desc: "Occasional product recommendations and supplier news." },
                ].map((s) => (
                  <div key={s.label} className="between settings-row">
                    <div>
                      <b className="small">{s.label}</b>
                      <div className="xs muted">{s.desc}</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked={s.label !== "Marketing newsletters"} />
                      <span className="switch-track" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- Notifications ---------- */}
          {active === "notifications" && (
            <div className="stack">
              <div className="between wrap">
                <div className="row">
                  <button className={notifFilter === "all" ? "chip chip-active" : "chip"} onClick={() => setNotifFilter("all")}>All</button>
                  <button className={notifFilter === "unread" ? "chip chip-active" : "chip"} onClick={() => setNotifFilter("unread")}>Unread</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>
              </div>
              {visibleNotifs.length === 0 ? (
                <EmptyState icon="box" title="All caught up" message="You have no unread notifications." />
              ) : (
                visibleNotifs.map((n) => (
                  <button key={n.id} className={`card notification-card${n.read ? "" : " unread"}`} onClick={() => markRead(n.id)}>
                    <span className={`notif-icon notif-${n.icon}`}>
                      {n.icon === "truck" && <Package size={16} />}
                      {n.icon === "package" && <Package size={16} />}
                      {n.icon === "wallet" && <Wallet size={16} />}
                      {n.icon === "info" && <Bell size={16} />}
                    </span>
                    <div className="grow">
                      <div className="between">
                        <b className="small">{n.title}</b>
                        <span className="xs muted">{n.time}</span>
                      </div>
                      <p className="xs muted" style={{ marginTop: 2 }}>{n.message}</p>
                    </div>
                    {!n.read && <span className="notif-dot" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}