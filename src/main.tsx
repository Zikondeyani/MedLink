import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/marketplace.css";
import "./styles/dashboard.css";
import "./styles/extras.css";
import App from "./App.tsx";
import { ToastProvider } from "./lib/toast.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { CartProvider } from "./lib/cart.tsx";
import { WishlistProvider } from "./lib/wishlist.tsx";
import { NotificationsProvider } from "./lib/notifications.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <NotificationsProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </NotificationsProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);