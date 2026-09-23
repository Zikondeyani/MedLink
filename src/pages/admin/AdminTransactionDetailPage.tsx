import {
  ArrowLeft,
  CheckCircle2,
  Landmark,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { customerOrders } from "../../data/orders";
import {
  getPaymentTransaction,
  getPricing,
  useReleasedOrders,
  useSuppliers,
} from "../../lib/registry";
import { mwk, prettyDate, timeOnly } from "../../lib/format";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { SupplierAvatar } from "../../components/marketplace/SupplierCard";

type DistributionRow = {
  supplier: ReturnType<typeof useSuppliers>[number];
  goods: number;
  released: boolean;
};

export default function AdminTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const suppliers = useSuppliers();
  const released = useReleasedOrders();
  const txn = id ? getPaymentTransaction(id) : undefined;

  if (!txn) {
    return (
      <div className="stack dash-page">
        <div className="card card-pad faq-empty">
          <XCircle size={34} className="muted" />
          <h3 className="h-card">Payment not found</h3>
          <p className="muted small">This payment transaction no longer exists.</p>
          <Link to="/admin/transactions" className="btn btn-primary" style={{ marginTop: 12 }}>
            Back to transactions
          </Link>
        </div>
      </div>
    );
  }

  const order = txn.orderId ? customerOrders.find((o) => o.id === txn.orderId) : undefined;

  /* Which suppliers this payment put into escrow (from the order lines). */
  const distribution: DistributionRow[] = [];
  if (order && txn.status === "succeeded") {
    const bySupplier = new Map<string, number>();
    order.lines.forEach((line) => {
      bySupplier.set(line.supplierId, (bySupplier.get(line.supplierId) ?? 0) + line.price * line.quantity);
    });
    bySupplier.forEach((goods, supplierId) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (!supplier) return;
      distribution.push({
        supplier,
        goods,
        released: (released[supplierId] ?? []).includes(order.id),
      });
    });
  }

  const distributionColumns: Column<DistributionRow>[] = [
    {
      key: "supplier",
      header: "Supplier",
      render: (r) => (
        <div className="row" style={{ gap: 10 }}>
          <SupplierAvatar supplier={r.supplier} size={32} />
          <div>
            <b className="small">{r.supplier.name}</b>
            <div className="xs muted">{r.supplier.category}</div>
          </div>
        </div>
      ),
    },
    {
      key: "goods",
      header: "Product value into escrow",
      align: "right",
      render: (r) => <b>{mwk(r.goods)}</b>,
    },
    {
      key: "fee",
      header: `MedLink fee (${Math.round(getPricing().serviceFeeRate * 100)}%)`,
      align: "right",
      render: (r) => <span className="small muted">{mwk(Math.round(r.goods * getPricing().serviceFeeRate))}</span>,
    },
    {
      key: "release",
      header: "Status",
      render: (r) =>
        r.released ? (
          <span className="badge badge-green">
            <CheckCircle2 size={11} /> Released
          </span>
        ) : (
          <span className="badge badge-amber">
            <Lock size={11} /> Held in escrow
          </span>
        ),
    },
  ];

  const statusTone = txn.status === "succeeded" ? "badge-green" : txn.status === "failed" ? "badge-red" : "badge-amber";
  const statusLabel = txn.status === "succeeded" ? "Succeeded" : txn.status === "failed" ? "Failed" : "Refunded";

  return (
    <div className="stack dash-page">
      <Link to="/admin/transactions" className="row muted small" style={{ gap: 6, width: "fit-content" }}>
        <ArrowLeft size={14} /> Back to transactions
      </Link>

      <div className="card card-pad">
        <div className="row wrap" style={{ gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="row wrap" style={{ gap: 10, alignItems: "center" }}>
              <h2 className="h-section" style={{ margin: 0, fontSize: 22 }}>{txn.id.toUpperCase()}</h2>
              <span className={`badge ${statusTone}`}>{statusLabel}</span>
            </div>
            <div className="xs muted" style={{ marginTop: 4 }}>
              {txn.orderNumber} · {prettyDate(txn.paidAt)} at {timeOnly(txn.paidAt)}
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {txn.orderId && (
              <Link to={`/admin/orders/${txn.orderId}`} className="btn btn-outline btn-sm">
                <ShoppingBag size={14} /> View order
              </Link>
            )}
          </div>
        </div>

        {txn.status === "failed" && txn.failureReason && (
          <div className="escrow-account escrow-account-warn" style={{ marginTop: 18 }}>
            <XCircle size={18} />
            <div>
              <b className="small">Payment failed — no funds entered escrow</b>
              <div className="xs muted">{txn.failureReason}</div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Breakdown</span>
              <h3 className="h-card">{txn.status === "succeeded" ? "Paid by buyer" : "Attempted charge"}</h3>
            </div>
            <Wallet size={17} className="muted" />
          </div>
          <div className="card escrow-settle">
            <div className="summary-row">
              <span>Product value</span>
              <b>{mwk(txn.goods)}</b>
            </div>
            <div className="summary-row">
              <span>MedLink service fee ({Math.round(getPricing().serviceFeeRate * 100)}%)</span>
              <b>{mwk(txn.serviceFee)}</b>
            </div>
            <div className="summary-row">
              <span>Delivery fee</span>
              <b>{mwk(txn.deliveryFee)}</b>
            </div>
            <div className="summary-row summary-total">
              <span>{txn.status === "succeeded" ? "Total" : "Total attempted"}</span>
              <b>{mwk(txn.amount)}</b>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Payment details</span>
              <h3 className="h-card">Who, how &amp; when</h3>
            </div>
            <ShieldCheck size={17} className="muted" />
          </div>
          <div className="stack-sm">
            <div className="summary-row">
              <span>Customer</span>
              <b className="small">{txn.customerName}</b>
            </div>
            <div className="summary-row">
              <span>Method</span>
              <div style={{ textAlign: "right" }}>
                <b className="small">{txn.method}</b>
                <div className="xs muted">{txn.reference}</div>
              </div>
            </div>
            <div className="summary-row">
              <span>Order</span>
              {txn.orderId ? (
                <Link to={`/admin/orders/${txn.orderId}`} className="link small">
                  {txn.orderNumber}
                </Link>
              ) : (
                <span className="xs muted">No order created</span>
              )}
            </div>
            <div className="summary-row">
              <span>Paid / attempted</span>
              <b className="small">{prettyDate(txn.paidAt)} · {timeOnly(txn.paidAt)}</b>
            </div>
            <div className="summary-row">
              <span>Status</span>
              <span className={`badge ${statusTone}`}>{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {distribution.length > 0 && (
        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Escrow distribution</span>
              <h3 className="h-card">Where this payment is held</h3>
            </div>
            <Landmark size={17} className="muted" />
          </div>
          <DataTable columns={distributionColumns} rows={distribution} minWidth={640} />
          <p className="xs muted" style={{ marginTop: 12 }}>
            MedLink holds each supplier's product value until delivery is confirmed, then releases it to their
            operating account from the Transactions page.
          </p>
        </div>
      )}

      {distribution.length === 0 && txn.status === "succeeded" && !txn.orderId && (
        <div className="card dash-tip">
          <Lock size={20} className="teal" />
          <p className="small muted" style={{ margin: 0 }}>
            This payment has no escrow distribution — it was not linked to a completed order in the seed data.
          </p>
        </div>
      )}
    </div>
  );
}