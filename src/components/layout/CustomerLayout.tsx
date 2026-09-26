import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import KycStatusBanner from "../supplier/KycStatusBanner";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileNav from "./MobileNav";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function CustomerLayout() {
  return (
    <div className="customer-shell">
      <ScrollToTop />
      <Navbar />
      {/* Renders nothing for customers and once a supplier is verified. */}
      <KycStatusBanner />
      <main className="customer-main">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}