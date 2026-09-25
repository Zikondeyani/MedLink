import { Route, Routes, Link } from "react-router-dom";
import CustomerLayout from "./components/layout/CustomerLayout";
import SupplierLayout from "./components/layout/SupplierLayout";
import AdminLayout from "./components/layout/AdminLayout";
import RequireRole from "./components/auth/RequireRole";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierStorePage from "./pages/SupplierStorePage";
import AllCategoriesPage from "./pages/AllCategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import SearchPage from "./pages/SearchPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import AccountPage from "./pages/AccountPage";
import SignUpPage from "./pages/SignUpPage";
import FAQPage from "./pages/FAQPage";
import BecomeASupplierPage from "./pages/BecomeASupplierPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage";
import AdminApplicationDetailPage from "./pages/admin/AdminApplicationDetailPage";
import AdminSuppliersPage from "./pages/admin/AdminSuppliersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailsPage from "./pages/admin/AdminOrderDetailsPage";
import AdminTransactionsPage from "./pages/admin/AdminTransactionsPage";
import AdminTransactionDetailPage from "./pages/admin/AdminTransactionDetailPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminPricingPage from "./pages/admin/AdminPricingPage";
import SupplierDashboardPage from "./pages/supplier/SupplierDashboardPage";
import SupplierStoreManagePage from "./pages/supplier/SupplierStorePage";
import SupplierProductsPage from "./pages/supplier/SupplierProductsPage";
import SupplierProductFormPage from "./pages/supplier/SupplierProductFormPage";
import SupplierOrdersPage from "./pages/supplier/SupplierOrdersPage";
import SupplierOrderDetailsPage from "./pages/supplier/SupplierOrderDetailsPage";
import SupplierInventoryPage from "./pages/supplier/SupplierInventoryPage";
import SupplierSalesPage from "./pages/supplier/SupplierSalesPage";
import SupplierCustomersPage from "./pages/supplier/SupplierCustomersPage";
import SupplierSettingsPage from "./pages/supplier/SupplierSettingsPage";
import NotificationsPage from "./pages/NotificationsPage";

function NotFound() {
  return (
    <div className="container page">
      <div className="empty">
        <h1 className="h-section">Page not found</h1>
        <p className="muted">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 12 }}>Back to marketplace</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ----- Customer marketplace ----- */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailsPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/suppliers/:slug" element={<SupplierStorePage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:category" element={<CategoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<RequireRole role="customer"><CheckoutPage /></RequireRole>} />
        <Route path="/orders" element={<RequireRole role="customer"><OrdersPage /></RequireRole>} />
        <Route path="/orders/:id" element={<RequireRole role="customer"><OrderDetailsPage /></RequireRole>} />
        <Route path="/account" element={<RequireRole role="customer"><AccountPage /></RequireRole>} />
        <Route path="/account/:tab" element={<RequireRole role="customer"><AccountPage /></RequireRole>} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/become-a-supplier" element={<BecomeASupplierPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ----- Platform admin (admin role only) ----- */}
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="applications" element={<AdminApplicationsPage />} />
        <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
        <Route path="suppliers" element={<AdminSuppliersPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="transactions/:id" element={<AdminTransactionDetailPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="pricing" element={<AdminPricingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* ----- Supplier dashboard (supplier role only) ----- */}
      <Route path="/supplier" element={<RequireRole role="supplier"><SupplierLayout /></RequireRole>}>
        <Route index element={<SupplierDashboardPage />} />
        <Route path="store" element={<SupplierStoreManagePage />} />
        <Route path="products" element={<SupplierProductsPage />} />
        <Route path="products/new" element={<SupplierProductFormPage />} />
        <Route path="products/:id/edit" element={<SupplierProductFormPage />} />
        <Route path="inventory" element={<SupplierInventoryPage />} />
        <Route path="orders" element={<SupplierOrdersPage />} />
        <Route path="orders/:id" element={<SupplierOrderDetailsPage />} />
        <Route path="customers" element={<SupplierCustomersPage />} />
        <Route path="sales" element={<SupplierSalesPage />} />
        <Route path="settings" element={<SupplierSettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
}