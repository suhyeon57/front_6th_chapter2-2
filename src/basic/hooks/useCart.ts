import { useState, useCallback, useEffect } from "react";
import { CartItem, ProductWithUI, Coupon } from "../../types";

interface UseCartProps {
  products: ProductWithUI[];
  addNotification: (
    message: string,
    type?: "error" | "success" | "warning"
  ) => void;
}

export function useCart({ products, addNotification }: UseCartProps) {
  // =====================================
  // 상태 관리
  // =====================================

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

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [totalItemCount, setTotalItemCount] = useState(0);

  // =====================================
  // 사이드 이펙트
  // =====================================

  // 장바구니 아이템 총 개수 업데이트
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    setTotalItemCount(count);
  }, [cart]);

  // 로컬스토리지에 장바구니 저장
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("cart");
    }
  }, [cart]);

  // =====================================
  // 유틸리티 함수
  // =====================================

  /**
   * 장바구니 아이템의 남은 재고 수량을 계산
   */
  const getRemainingStock = useCallback(
    (product: ProductWithUI): number => {
      const cartItem = cart.find((item) => item.product.id === product.id);
      return product.stock - (cartItem?.quantity || 0);
    },
    [cart]
  );

  /**
   * 장바구니 아이템에 적용 가능한 최대 할인율을 계산
   */
  const getMaxApplicableDiscount = useCallback(
    (item: CartItem): number => {
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
    },
    [cart]
  );

  /**
   * 개별 장바구니 아이템의 총 가격 계산 (할인 적용 후)
   */
  const calculateItemTotal = useCallback(
    (item: CartItem): number => {
      const { price } = item.product;
      const { quantity } = item;
      const discount = getMaxApplicableDiscount(item);

      return Math.round(price * quantity * (1 - discount));
    },
    [getMaxApplicableDiscount]
  );

  /**
   * 전체 장바구니의 총 가격 계산 (할인 전/후)
   */
  const calculateCartTotal = useCallback((): {
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
  }, [cart, selectedCoupon, calculateItemTotal]);

  // =====================================
  // 장바구니 관리 함수
  // =====================================

  /**
   * 상품을 장바구니에 추가
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
    [getRemainingStock, addNotification]
  );

  /**
   * 장바구니에서 상품 제거
   */
  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId)
    );
  }, []);

  /**
   * 장바구니 아이템 수량 변경
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
    [products, removeFromCart, addNotification]
  );

  /**
   * 쿠폰 적용
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
    [calculateCartTotal, addNotification]
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
  // 계산된 값들
  // =====================================

  const totals = calculateCartTotal();

  // =====================================
  // 반환값
  // =====================================

  return {
    // 상태
    cart,
    selectedCoupon,
    totalItemCount,
    totals,

    // 함수들
    addToCart,
    removeFromCart,
    updateQuantity,
    applyCoupon,
    completeOrder,
    getRemainingStock,
    calculateItemTotal,

    // 쿠폰 관리
    setSelectedCoupon,
  };
}
