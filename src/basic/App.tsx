import { useState, useCallback } from "react";
//import { Notification } from "../types"; // 모든 타입 import
import { ShoppingCartIcon } from "./components/icons";
import { ToastList } from "./components/ui/ToastList";
import { AdminPage } from "./components/AdminPage";
import { ProductPage } from "./components/ProductPage"; // ProductPage import 추가
import { CartPage } from "./components/CartPage"; // CartPage import 추가
import { useCart } from "./hooks/useCart";
import { useProducts } from "./hooks/useProducts";
import { useCoupons } from "./hooks/useCoupons";
import { useDebounce } from "./utils/hooks/useDebounce"; // useDebounce import 추가
import { formatPrice } from "./utils/formatters"; // formatPrice import 추가
import { useNotification } from "./utils/hooks/useNotifications"; // useNotification import 추가
const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { notifications, addNotification, removeNotification } =
    useNotification();
  const [activeTab, setActiveTab] = useState<"products" | "coupons">(
    "products"
  );

  const products = useProducts({
    addNotification,
  });

  const cart = useCart({
    products: products.products, // products.products 사용
    addNotification,
  });

  const coupons = useCoupons({
    addNotification,
    selectedCoupon: cart.selectedCoupon,
    setSelectedCoupon: cart.setSelectedCoupon,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // ✅ useDebounce 사용

  const formatPriceWithStock = useCallback(
    (price: number, productId?: string): string => {
      return formatPrice(price, {
        productId,
        products: products.products,
        getRemainingStock: cart.getRemainingStock,
        isAdmin,
      });
    },
    [products.products, cart.getRemainingStock, isAdmin]
  );

  // 검색어로 필터링된 상품 목록
  const filteredProducts = debouncedSearchTerm
    ? products.products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase()))
      )
    : products.products;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastList
        toasts={notifications}
        onClose={(id) => removeNotification(id)}
      />
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-1">
              <h1 className="text-xl font-semibold text-gray-800">SHOP</h1>
              {/* 검색창 - 안티패턴: 검색 로직이 컴포넌트에 직접 포함 */}
              {!isAdmin && (
                <div className="ml-8 flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="상품 검색..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
            <nav className="flex items-center space-x-4">
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  isAdmin
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {isAdmin ? "쇼핑몰로 돌아가기" : "관리자 페이지로"}
              </button>
              {!isAdmin && (
                <div className="relative">
                  <ShoppingCartIcon
                    className="w-6 h-6 text-gray-700"
                    strokeWidth={2}
                  />
                  {cart.cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.totalItemCount}
                    </span>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isAdmin ? (
          // AdminPage 컴포넌트 사용
          <AdminPage
            activeTab={activeTab}
            productsHook={products}
            coupons={coupons.coupons}
            showCouponForm={coupons.showCouponForm}
            couponForm={coupons.couponForm}
            onTabChange={setActiveTab}
            onShowCouponForm={coupons.toggleCouponForm}
            onCouponSubmit={coupons.submitCouponForm}
            onCouponFormChange={coupons.updateCouponForm}
            onCancelCouponForm={coupons.cancelCouponForm}
            onDeleteCoupon={coupons.deleteCoupon}
            formatPrice={formatPriceWithStock}
            addNotification={addNotification}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <ProductPage
              products={products.products}
              filteredProducts={filteredProducts}
              debouncedSearchTerm={debouncedSearchTerm}
              onAddToCart={cart.addToCart}
              getRemainingStock={cart.getRemainingStock}
              formatPrice={formatPriceWithStock}
            />

            <CartPage
              cart={cart.cart}
              coupons={coupons.coupons}
              selectedCoupon={cart.selectedCoupon}
              totals={cart.totals}
              onUpdateQuantity={cart.updateQuantity}
              onRemoveFromCart={cart.removeFromCart}
              onApplyCoupon={cart.applyCoupon}
              onSetSelectedCoupon={cart.setSelectedCoupon}
              onCompleteOrder={cart.completeOrder}
              calculateItemTotal={cart.calculateItemTotal}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
