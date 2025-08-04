import { useState, useCallback, useEffect } from "react";
import {
  CartItem,
  Coupon,
  Product,
  ProductWithUI,
  Notification,
} from "../types"; // 모든 타입 import
import { ShoppingCartIcon } from "./components/icons";
import { ToastList } from "./components/ui/ToastList";
import { AdminPage } from "./components/AdminPage";
import { ProductPage } from "./components/ProductPage"; // ProductPage import 추가
import { CartPage } from "./components/CartPage"; // CartPage import 추가

// 초기 데이터
const initialProducts: ProductWithUI[] = [
  {
    id: "p1",
    name: "상품1",
    price: 10000,
    stock: 20,
    discounts: [
      { quantity: 10, rate: 0.1 },
      { quantity: 20, rate: 0.2 },
    ],
    description: "최고급 품질의 프리미엄 상품입니다.",
  },
  {
    id: "p2",
    name: "상품2",
    price: 20000,
    stock: 20,
    discounts: [{ quantity: 10, rate: 0.15 }],
    description: "다양한 기능을 갖춘 실용적인 상품입니다.",
    isRecommended: true,
  },
  {
    id: "p3",
    name: "상품3",
    price: 30000,
    stock: 20,
    discounts: [
      { quantity: 10, rate: 0.2 },
      { quantity: 30, rate: 0.25 },
    ],
    description: "대용량과 고성능을 자랑하는 상품입니다.",
  },
];

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

  // 로컬스토리지에서 상품 목록을 불러와 초기화
  const [products, setProducts] = useState<ProductWithUI[]>(() => {
    const saved = localStorage.getItem("products");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialProducts;
      }
    }
    return initialProducts;
  });

  // 로컬스토리지에서 장바구니 목록을 불러와 초기화
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

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

  // 선택된 쿠폰 상태
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // 관리자 모드 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 알림 메시지 목록
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI 표시 상태들
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "coupons">(
    "products"
  );
  const [showProductForm, setShowProductForm] = useState(false);

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // 관리자 모드 - 상품 편집 상태
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: 0,
    stock: 0,
    description: "",
    discounts: [] as Array<{ quantity: number; rate: number }>,
  });

  // 관리자 모드 - 쿠폰 생성 폼 상태
  const [couponForm, setCouponForm] = useState({
    name: "",
    code: "",
    discountType: "amount" as "amount" | "percentage",
    discountValue: 0,
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
      const product = products.find((p) => p.id === productId);
      if (product && getRemainingStock(product) <= 0) {
        return "SOLD OUT";
      }
    }

    if (isAdmin) {
      return `${price.toLocaleString()}원`;
    }

    return `₩${price.toLocaleString()}`;
  };

  // =====================================
  // 할인 및 가격 계산 함수 (Discount & Price Calculation)
  // =====================================

  /**
   * 장바구니 아이템에 적용 가능한 최대 할인율을 계산
   * @param item - 장바구니 아이템
   * @returns 최대 할인율 (0~1 사이의 값)
   */
  const getMaxApplicableDiscount = (item: CartItem): number => {
    const { discounts } = item.product;
    const { quantity } = item;

    const baseDiscount = discounts.reduce((maxDiscount, discount) => {
      return quantity >= discount.quantity && discount.rate > maxDiscount
        ? discount.rate
        : maxDiscount;
    }, 0);

    const hasBulkPurchase = cart.some((cartItem) => cartItem.quantity >= 10);
    if (hasBulkPurchase) {
      return Math.min(baseDiscount + 0.05, 0.5); // 대량 구매 시 추가 5% 할인
    }

    return baseDiscount;
  };

  /**
   * 개별 장바구니 아이템의 총 가격 계산 (할인 적용 후)
   * @param item - 장바구니 아이템
   * @returns 할인 적용 후 총 가격
   */
  const calculateItemTotal = (item: CartItem): number => {
    const { price } = item.product;
    const { quantity } = item;
    const discount = getMaxApplicableDiscount(item);

    return Math.round(price * quantity * (1 - discount));
  };

  /**
   * 전체 장바구니의 총 가격 계산 (할인 전/후)
   * @returns 할인 전 가격과 할인 후 가격 객체
   */
  const calculateCartTotal = (): {
    totalBeforeDiscount: number;
    totalAfterDiscount: number;
  } => {
    let totalBeforeDiscount = 0;
    let totalAfterDiscount = 0;

    cart.forEach((item) => {
      const itemPrice = item.product.price * item.quantity;
      totalBeforeDiscount += itemPrice;
      totalAfterDiscount += calculateItemTotal(item);
    });

    if (selectedCoupon) {
      if (selectedCoupon.discountType === "amount") {
        totalAfterDiscount = Math.max(
          0,
          totalAfterDiscount - selectedCoupon.discountValue
        );
      } else {
        totalAfterDiscount = Math.round(
          totalAfterDiscount * (1 - selectedCoupon.discountValue / 100)
        );
      }
    }

    return {
      totalBeforeDiscount: Math.round(totalBeforeDiscount),
      totalAfterDiscount: Math.round(totalAfterDiscount),
    };
  };

  /**
   * 장바구니 아이템의 남은 재고 수량을 계산
   * @param product - 상품 정보
   * @returns 남은 재고 수량
   */
  const getRemainingStock = (product: Product): number => {
    const cartItem = cart.find((item) => item.product.id === product.id);
    const remaining = product.stock - (cartItem?.quantity || 0);

    return remaining;
  };

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

  // 장바구니 아이템 총 개수
  const [totalItemCount, setTotalItemCount] = useState(0);

  // =====================================
  // 사이드 이펙트 (Side Effects)
  // =====================================

  // 장바구니 아이템 총 개수 업데이트
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    setTotalItemCount(count);
  }, [cart]);

  // 로컬스토리지에 상품 목록 저장
  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  // 로컬스토리지에 쿠폰 목록 저장
  useEffect(() => {
    localStorage.setItem("coupons", JSON.stringify(coupons));
  }, [coupons]);

  // 로컬스토리지에 장바구니 저장
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("cart");
    }
  }, [cart]);

  // 검색어 디바운싱 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // =====================================
  // 장바구니 관리 함수 (Cart Management)
  // =====================================

  /**
   * 상품을 장바구니에 추가
   * @param product - 추가할 상품
   */
  /**
   * 상품을 장바구니에 추가
   * @param product - 추가할 상품
   */
  const addToCart = useCallback(
    (product: ProductWithUI) => {
      const remainingStock = getRemainingStock(product);
      if (remainingStock <= 0) {
        addNotification("재고가 부족합니다!", "error");
        return;
      }

      setCart((prevCart) => {
        const existingItem = prevCart.find(
          (item) => item.product.id === product.id
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + 1;

          if (newQuantity > product.stock) {
            addNotification(
              `재고는 ${product.stock}개까지만 있습니다.`,
              "error"
            );
            return prevCart;
          }

          return prevCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        }

        return [...prevCart, { product, quantity: 1 }];
      });

      addNotification("장바구니에 담았습니다", "success");
    },
    [cart, addNotification, getRemainingStock]
  );

  /**
   * 장바구니에서 상품 제거
   * @param productId - 제거할 상품 ID
   */
  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId)
    );
  }, []);

  /**
   * 장바구니 아이템 수량 변경
   * @param productId - 상품 ID
   * @param newQuantity - 새로운 수량
   */
  /**
   * 장바구니 아이템 수량 변경
   * @param productId - 상품 ID
   * @param newQuantity - 새로운 수량
   */
  const updateQuantity = useCallback(
    (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
      }

      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const maxStock = product.stock;
      if (newQuantity > maxStock) {
        addNotification(`재고는 ${maxStock}개까지만 있습니다.`, "error");
        return;
      }

      setCart((prevCart) =>
        prevCart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    },
    [products, removeFromCart, addNotification, getRemainingStock]
  );

  // =====================================
  // 쿠폰 및 결제 관리 함수 (Coupon & Payment Management)
  // =====================================

  /**
   * 쿠폰 적용
   * @param coupon - 적용할 쿠폰
   */
  const applyCoupon = useCallback(
    (coupon: Coupon) => {
      const currentTotal = calculateCartTotal().totalAfterDiscount;

      if (currentTotal < 10000 && coupon.discountType === "percentage") {
        addNotification(
          "percentage 쿠폰은 10,000원 이상 구매 시 사용 가능합니다.",
          "error"
        );
        return;
      }

      setSelectedCoupon(coupon);
      addNotification("쿠폰이 적용되었습니다.", "success");
    },
    [addNotification, calculateCartTotal]
  );

  /**
   * 주문 완료 처리
   */
  const completeOrder = useCallback(() => {
    const orderNumber = `ORD-${Date.now()}`;
    addNotification(
      `주문이 완료되었습니다. 주문번호: ${orderNumber}`,
      "success"
    );
    setCart([]);
    setSelectedCoupon(null);
  }, [addNotification]);

  // =====================================
  // 관리자 모드 - 상품 관리 함수 (Admin - Product Management)
  // =====================================

  /**
   * 새 상품 추가
   * @param newProduct - 추가할 상품 정보 (ID 제외)
   */
  const addProduct = useCallback(
    (newProduct: Omit<ProductWithUI, "id">) => {
      const product: ProductWithUI = {
        ...newProduct,
        id: `p${Date.now()}`,
      };
      setProducts((prev) => [...prev, product]);
      addNotification("상품이 추가되었습니다.", "success");
    },
    [addNotification]
  );

  /**
   * 기존 상품 정보 업데이트
   * @param productId - 업데이트할 상품 ID
   * @param updates - 업데이트할 정보
   */
  const updateProduct = useCallback(
    (productId: string, updates: Partial<ProductWithUI>) => {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? { ...product, ...updates } : product
        )
      );
      addNotification("상품이 수정되었습니다.", "success");
    },
    [addNotification]
  );

  /**
   * 상품 삭제
   * @param productId - 삭제할 상품 ID
   */
  const deleteProduct = useCallback(
    (productId: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      addNotification("상품이 삭제되었습니다.", "success");
    },
    [addNotification]
  );

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
      if (selectedCoupon?.code === couponCode) {
        setSelectedCoupon(null);
      }
      addNotification("쿠폰이 삭제되었습니다.", "success");
    },
    [selectedCoupon, addNotification]
  );

  // =====================================
  // 폼 핸들러 함수 (Form Handlers)
  // =====================================

  /**
   * 상품 폼 제출 처리
   */
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && editingProduct !== "new") {
      updateProduct(editingProduct, productForm);
      setEditingProduct(null);
    } else {
      addProduct({
        ...productForm,
        discounts: productForm.discounts,
      });
    }
    setProductForm({
      name: "",
      price: 0,
      stock: 0,
      description: "",
      discounts: [],
    });
    setEditingProduct(null);
    setShowProductForm(false);
  };

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

  /**
   * 상품 편집 모드 시작
   * @param product - 편집할 상품
   */
  const startEditProduct = (product: ProductWithUI) => {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description || "",
      discounts: product.discounts || [],
    });
    setShowProductForm(true);
  };

  // =====================================
  // 계산된 값들 (Computed Values)
  // =====================================

  // 전체 장바구니 총액 계산
  const totals = calculateCartTotal();

  // 검색어로 필터링된 상품 목록
  const filteredProducts = debouncedSearchTerm
    ? products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase()))
      )
    : products;

  // AdminPage용 핸들러 함수들 추가
  const handleShowProductForm = useCallback(() => {
    setEditingProduct("new");
    setProductForm({
      name: "",
      price: 0,
      stock: 0,
      description: "",
      discounts: [],
    });
    setShowProductForm(true);
  }, []);

  const handleProductFormChange = useCallback((field: string, value: any) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCancelProductForm = useCallback(() => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      price: 0,
      stock: 0,
      description: "",
      discounts: [],
    });
    setShowProductForm(false);
  }, []);

  const handleAddDiscount = useCallback(() => {
    setProductForm((prev) => ({
      ...prev,
      discounts: [...prev.discounts, { quantity: 10, rate: 0.1 }],
    }));
  }, []);

  const handleRemoveDiscount = useCallback((index: number) => {
    setProductForm((prev) => ({
      ...prev,
      discounts: prev.discounts.filter((_, i) => i !== index),
    }));
  }, []);

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
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalItemCount}
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
            products={products}
            coupons={coupons}
            showProductForm={showProductForm}
            showCouponForm={showCouponForm}
            editingProduct={editingProduct}
            productForm={productForm}
            couponForm={couponForm}
            onTabChange={setActiveTab}
            onShowProductForm={handleShowProductForm}
            onProductSubmit={handleProductSubmit}
            onProductFormChange={handleProductFormChange}
            onCancelProductForm={handleCancelProductForm}
            onStartEditProduct={startEditProduct}
            onDeleteProduct={deleteProduct}
            onAddDiscount={handleAddDiscount}
            onRemoveDiscount={handleRemoveDiscount}
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
              products={products}
              filteredProducts={filteredProducts}
              debouncedSearchTerm={debouncedSearchTerm}
              onAddToCart={addToCart}
              getRemainingStock={getRemainingStock}
              formatPrice={formatPrice}
            />

            {/* CartPage 컴포넌트 사용 */}
            <CartPage
              cart={cart}
              coupons={coupons}
              selectedCoupon={selectedCoupon}
              totals={totals}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onApplyCoupon={applyCoupon}
              onSetSelectedCoupon={setSelectedCoupon}
              onCompleteOrder={completeOrder}
              calculateItemTotal={calculateItemTotal}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
