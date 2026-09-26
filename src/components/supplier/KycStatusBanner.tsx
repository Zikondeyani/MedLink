/* ============================================================
   MedLink — supplier KYC status banner

   A supplier no longer keeps a reference number or emails anyone to
   ask where their application stands. This sits above every page
   and always answers that question from the database:

     no application  →  start or finish verification
     pending         →  under review, store not public yet
     rejected        →  why, and a button to fix it
     approved        →  nothing to say, so it hides

   It is a no-op for customers and admins, so it can be mounted once
   in the shared layouts.
   ============================================================ */
import { AlertTriangle, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { KycStatus } from "../../data/types";
import { useAuth } from "../../lib/auth";
import { useDataStatus, useOwnApplication } from "../../lib/registry";

export function kycStatusLabel(status: KycStatus): string {
  if (status === "approved") return "Verified";
  if (status === "rejected") return "Not verified";
  return "Under review";
}

export function kycStatusTone(status: KycStatus): string {
  if (status === "approved") return "badge-green";
  if (status === "rejected") return "badge-red";
  return "badge-amber";
}

export default function KycStatusBanner() {
  const { user } = useAuth();
  const { loading } = useDataStatus();
  const application = useOwnApplication();

  // Only a supplier has a KYC to be waiting on.
  if (user?.role !== "supplier") return null;
  // Don't flash a banner while we find out whether there is one.
  if (loading) return null;

  if (application?.status === "approved") return null;

  if (application?.status === "rejected") {
    return (
      <div className="kyc-banner kyc-banner-red" role="status">
        <AlertTriangle size={18} className="shrink-0" />
        <div className="grow">
          <b className="small">Your store is not public — KYC was not approved</b>
          <p className="xs" style={{ marginTop: 2 }}>
            {application.reviewNote
              ? `MedLink said: “${application.reviewNote}”`
              : "MedLink could not verify the details you sent. Fix the details or documents and send it again."}
          </p>
        </div>
        <Link to="/supplier/verification" className="btn btn-sm btn-primary shrink-0">
          Fix and resubmit <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  if (application?.status === "pending") {
    return (
      <div className="kyc-banner kyc-banner-amber" role="status">
        <Clock size={18} className="shrink-0" />
        <div className="grow">
          <b className="small">KYC under review — reference {application.ref}</b>
          <p className="xs" style={{ marginTop: 2 }}>
            You can use every part of your supplier dashboard now. Your store and products stay hidden from
            buyers until MedLink approves the verification.
          </p>
        </div>
        <Link to="/supplier/verification" className="btn btn-sm btn-outline shrink-0">
          View submission
        </Link>
      </div>
    );
  }

  return (
    <div className="kyc-banner kyc-banner-amber" role="status">
      <ShieldCheck size={18} className="shrink-0" />
      <div className="grow">
        <b className="small">Finish your supplier verification to publish your store</b>
        <p className="xs" style={{ marginTop: 2 }}>
          Your dashboard, products and settings all work now. Buyers only see your store once MedLink has
          verified your business.
        </p>
      </div>
      <Link to="/supplier/verification" className="btn btn-sm btn-primary shrink-0">
        {application ? "Continue verification" : "Start verification"} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
