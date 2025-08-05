import { useState, useCallback, useEffect } from "react";
import { Notification } from "../types"; // 모든 타입 import
import { ShoppingCartIcon } from "./components/icons";
import { ToastList } from "./components/ui/ToastList";
import { AdminPage } from "./components/AdminPage";
import { ProductPage } from "./components/ProductPage"; // ProductPage import 추가
import { CartPage } from "./components/CartPage"; // CartPage import 추가
import { useCart } from "./hooks/useCart";
import { useProducts } from "./hooks/useProducts";
import { useCoupons } from "./hooks/useCoupons";

const App = () => {
  // =====================================
  // 알림 관리 함수 (Notification Management)
  // =====================================
  const addNotification = useCallback(
    (message: string, type: "error" | "success" | "warning" = "success") => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3000);
    },
    []
  );

  // =====================================
  // 상품 관리 (useProducts 훅 사용)
  // =====================================
  const products = useProducts({
    addNotification,
  });

  // =====================================
  // 장바구니 관리 (useCart 훅 사용)
  // =====================================
  const cart = useCart({
    products: products.products, // products.products 사용
    addNotification,
  });

  // =====================================
  // 쿠폰 관리 (useCoupons 훅 사용)
  // =====================================
  const coupons = useCoupons({
    addNotification,
    selectedCoupon: cart.selectedCoupon,
    setSelectedCoupon: cart.setSelectedCoupon,
  });

  // 관리자 모드 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 알림 메시지 목록
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI 표시 상태들
  //const [showCouponForm, setShowCouponForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "coupons">(
    "products"
  );

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // =====================================
  // 유틸리티 함수 (Utility Functions)
  // =====================================
  const formatPrice = (price: number, productId?: string): string => {
    if (productId) {
      const product = products.products.find((p) => p.id === productId);
      if (product && cart.getRemainingStock(product) <= 0) {
        return "SOLD OUT";
      }
    }

    if (isAdmin) {
      return `${price.toLocaleString()}원`;
    }

    return `₩${price.toLocaleString()}`;
  };

  // 검색어 디바운싱 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  // =====================================
  // 계산된 값들 (Computed Values)
  // =====================================

  // 검색어로 필터링된 상품 목록
  const filteredProducts = debouncedSearchTerm
    ? products.products.filter(
        // products.products 사용
        (product) =>
          product.name
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase()))
      )
    : products.products; // products.products 사용

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastList
        toasts={notifications}
        onClose={(id) =>
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }
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
            products={products.products}
            coupons={coupons.coupons} // ✅ coupons.coupons 사용
            showProductForm={products.showProductForm}
            showCouponForm={coupons.showCouponForm} // ✅ coupons.showCouponForm 사용
            editingProduct={products.editingProduct}
            productForm={products.productForm}
            couponForm={coupons.couponForm} // ✅ coupons.couponForm 사용
            onTabChange={setActiveTab}
            onShowProductForm={products.showProductFormHandler}
            onProductSubmit={products.submitProductForm}
            onProductFormChange={products.updateProductForm}
            onCancelProductForm={products.cancelProductForm}
            onStartEditProduct={products.startEditProduct}
            onDeleteProduct={products.deleteProduct}
            onAddDiscount={products.addDiscount}
            onRemoveDiscount={products.removeDiscount}
            onShowCouponForm={coupons.toggleCouponForm} // ✅ coupons.toggleCouponForm 사용
            onCouponSubmit={coupons.submitCouponForm} // ✅ coupons.submitCouponForm 사용
            onCouponFormChange={coupons.updateCouponForm} // ✅ coupons.updateCouponForm 사용
            onCancelCouponForm={coupons.cancelCouponForm} // ✅ coupons.cancelCouponForm 사용
            onDeleteCoupon={coupons.deleteCoupon} // ✅ coupons.deleteCoupon 사용
            formatPrice={formatPrice}
            addNotification={addNotification}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ProductPage 컴포넌트 사용 */}
            <ProductPage
              products={products.products}
              filteredProducts={filteredProducts}
              debouncedSearchTerm={debouncedSearchTerm}
              onAddToCart={cart.addToCart}
              getRemainingStock={cart.getRemainingStock}
              formatPrice={formatPrice}
            />

            {/* CartPage */}
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
