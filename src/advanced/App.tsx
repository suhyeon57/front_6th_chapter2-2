import { Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { ToastList } from "./components/ui/ToastList";
import { AdminPage } from "./components/AdminPage";
import { ProductPage } from "./components/ProductPage";
import { CartPage } from "./components/CartPage";
import { Header } from "./components/Header";

import {
  isAdminAtom,
  activeTabAtom,
  searchTermAtom,
  debouncedSearchTermAtom,
  formatPriceAtom,
} from "./atoms";
import { useCartJotai } from "./hooks/useCart";
import { useNotificationJotai } from "./utils/hooks/useNotification";
import { useProducts } from "./hooks/useProducts";
import { useCoupons } from "./hooks/useCoupons";

const AppContent = () => {
  const [isAdmin, setIsAdmin] = useAtom(isAdminAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const formatPriceWithStock = useAtomValue(formatPriceAtom);
  const notifications = useNotificationJotai();
  const cart = useCartJotai({ addNotification: notifications.addNotification });

  const productsHook = useProducts({
    addNotification: notifications.addNotification,
  });
  const coupons = useCoupons({
    addNotification: notifications.addNotification,
    selectedCoupon: cart.selectedCoupon,
    setSelectedCoupon: cart.setSelectedCoupon,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastList
        toasts={notifications.notifications}
        onClose={notifications.removeNotification}
      />

      <Header
      // isAdmin={isAdmin}
      // searchTerm={searchTerm}
      // cartItemCount={cart.totalItemCount}
      // onToggleAdmin={() => setIsAdmin(!isAdmin)}
      // onSearchChange={setSearchTerm}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isAdmin ? (
          <AdminPage
            activeTab={activeTab}
            productsHook={productsHook}
            couponsHook={coupons}
            onTabChange={setActiveTab}
            formatPrice={formatPriceWithStock}
            addNotification={notifications.addNotification}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <ProductPage />
            <CartPage />
          </div>
        )}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Provider>
      <AppContent />
    </Provider>
  );
};

export default App;
