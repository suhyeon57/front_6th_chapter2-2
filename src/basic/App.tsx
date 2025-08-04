import { useState, useCallback, useEffect } from "react";
import { Coupon, Notification } from "../types"; // 모든 타입 import
import { ShoppingCartIcon } from "./components/icons";
import { ToastList } from "./components/ui/ToastList";
import { AdminPage } from "./components/AdminPage";
import { ProductPage } from "./components/ProductPage"; // ProductPage import 추가
import { CartPage } from "./components/CartPage"; // CartPage import 추가
import { useCart } from "./hooks/useCart";
import { useProducts } from "./hooks/useProducts";

const initialCoupons: Coupon[] = [
  {
    name: "5000원 할인",
    code: "AMOUNT5000",
    discountType: "amount",
    discountValue: 5000,
  },
  {
    name: "10% 할인",
    code: "PERCENT10",
    discountType: "percentage",
    discountValue: 10,
  },
];

const App = () => {
  // =====================================
  // 상태 관리 (State Management)
  // =====================================

  // 로컬스토리지에서 쿠폰 목록을 불러와 초기화
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem("coupons");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialCoupons;
      }
    }
    return initialCoupons;
  });

  // 관리자 모드 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 알림 메시지 목록
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI 표시 상태들
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "coupons">(
    "products"
  );

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // 관리자 모드 - 쿠폰 생성 폼 상태
  const [couponForm, setCouponForm] = useState({
    name: "",
    code: "",
    discountType: "amount" as "amount" | "percentage",
    discountValue: 0,
  });

  // =====================================
  // 알림 관리 함수 (Notification Management)
  // =====================================

  /**
   * 새로운 알림 메시지를 추가하고 3초 후 자동 제거
   * @param message - 알림 메시지
   * @param type - 알림 타입 ('error' | 'success' | 'warning')
   */
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
  // 유틸리티 함수 (Utility Functions)
  // =====================================

  /**
   * 가격을 포맷팅하여 문자열로 반환
   * @param price - 포맷팅할 가격
   * @param productId - 상품 ID (재고 확인용)
   * @returns 포맷팅된 가격 문자열
   */
  const formatPrice = (price: number, productId?: string): string => {
    if (productId) {
      const product = products.products.find((p) => p.id === productId); // products.products 사용
      if (product && cart.getRemainingStock(product) <= 0) {
        return "SOLD OUT";
      }
    }

    if (isAdmin) {
      return `${price.toLocaleString()}원`;
    }

    return `₩${price.toLocaleString()}`;
  };

  // 로컬스토리지에 쿠폰 목록 저장
  useEffect(() => {
    localStorage.setItem("coupons", JSON.stringify(coupons));
  }, [coupons]);

  // 검색어 디바운싱 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // =====================================
  // 관리자 모드 - 쿠폰 관리 함수 (Admin - Coupon Management)
  // =====================================

  /**
   * 새 쿠폰 추가
   * @param newCoupon - 추가할 쿠폰 정보
   */
  const addCoupon = useCallback(
    (newCoupon: Coupon) => {
      const existingCoupon = coupons.find((c) => c.code === newCoupon.code);
      if (existingCoupon) {
        addNotification("이미 존재하는 쿠폰 코드입니다.", "error");
        return;
      }
      setCoupons((prev) => [...prev, newCoupon]);
      addNotification("쿠폰이 추가되었습니다.", "success");
    },
    [coupons, addNotification]
  );

  /**
   * 쿠폰 삭제
   * @param couponCode - 삭제할 쿠폰 코드
   */
  const deleteCoupon = useCallback(
    (couponCode: string) => {
      setCoupons((prev) => prev.filter((c) => c.code !== couponCode));
      if (cart.selectedCoupon?.code === couponCode) {
        // ✅ cart.selectedCoupon 사용
        cart.setSelectedCoupon(null); // ✅ cart.setSelectedCoupon 사용
      }
      addNotification("쿠폰이 삭제되었습니다.", "success");
    },
    [cart.selectedCoupon, cart.setSelectedCoupon, addNotification] // ✅ 올바른 의존성
  );

  // =====================================
  // 폼 핸들러 함수 (Form Handlers)
  // =====================================

  /**
   * 쿠폰 폼 제출 처리
   */
  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCoupon(couponForm);
    setCouponForm({
      name: "",
      code: "",
      discountType: "amount",
      discountValue: 0,
    });
    setShowCouponForm(false);
  };

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

  const handleShowCouponForm = useCallback(() => {
    setShowCouponForm(!showCouponForm);
  }, [showCouponForm]);

  const handleCouponFormChange = useCallback((field: string, value: any) => {
    setCouponForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCancelCouponForm = useCallback(() => {
    setShowCouponForm(false);
    setCouponForm({
      name: "",
      code: "",
      discountType: "amount",
      discountValue: 0,
    });
  }, []);

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
            coupons={coupons}
            showProductForm={products.showProductForm} // ✅ boolean 상태
            showCouponForm={showCouponForm}
            editingProduct={products.editingProduct}
            productForm={products.productForm}
            couponForm={couponForm}
            onTabChange={setActiveTab}
            onShowProductForm={products.showProductFormHandler} // ✅ 함수 사용
            onProductSubmit={products.submitProductForm}
            onProductFormChange={products.updateProductForm}
            onCancelProductForm={products.cancelProductForm}
            onStartEditProduct={products.startEditProduct}
            onDeleteProduct={products.deleteProduct}
            onAddDiscount={products.addDiscount}
            onRemoveDiscount={products.removeDiscount}
            onShowCouponForm={handleShowCouponForm}
            onCouponSubmit={handleCouponSubmit}
            onCouponFormChange={handleCouponFormChange}
            onCancelCouponForm={handleCancelCouponForm}
            onDeleteCoupon={deleteCoupon}
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
              coupons={coupons}
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
