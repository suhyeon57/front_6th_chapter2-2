import { CartItem, ProductWithUI, Coupon } from "../../types";

/**
 * 개별 아이템의 할인 적용 후 총액 계산
 * @param item - 장바구니 아이템
 * @param allCartItems - 전체 장바구니 아이템들 (대량 구매 할인 계산용)
 * @returns 할인 적용 후 총액
 */
export function calculateItemTotal(
  item: CartItem,
  allCartItems: CartItem[]
): number {
  const baseTotal = item.product.price * item.quantity;
  const discountRate = getMaxApplicableDiscount(item, allCartItems);
  const discountAmount = baseTotal * discountRate;

  return Math.round(baseTotal - discountAmount);
}

/**
 * 적용 가능한 최대 할인율 계산
 * @param item - 장바구니 아이템
 * @param allCartItems - 전체 장바구니 아이템들
 * @returns 최대 할인율 (0.1 = 10%)
 */
export function getMaxApplicableDiscount(
  item: CartItem,
  allCartItems: CartItem[]
): number {
  const { discounts } = item.product;
  const { quantity } = item;

  // 1. 기본 할인 (상품별 설정된 할인)
  const baseDiscount = discounts.reduce((maxDiscount, discount) => {
    return quantity >= discount.quantity && discount.rate > maxDiscount
      ? discount.rate
      : maxDiscount;
  }, 0);

  // 2. 대량 구매 시 추가 5% 할인 (10개 이상일 때)
  const hasBulkPurchase = allCartItems.some(
    (cartItem) => cartItem.quantity >= 10
  );
  const additionalDiscount = hasBulkPurchase ? 0.05 : 0;

  // 3. 최종 할인율 (최대 50% 제한)
  const totalDiscount = Math.min(baseDiscount + additionalDiscount, 0.5);

  return totalDiscount;
}

/**
 * 장바구니 총액 계산 (할인 전/후, 할인액)
 * @param cart - 장바구니 아이템들
 * @param coupon - 적용된 쿠폰 (옵션)
 * @returns 총액 정보 객체
 */
export function calculateCartTotal(
  cart: CartItem[],
  coupon: Coupon | null = null
) {
  // 할인 전 총액
  const totalBeforeDiscount = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // 상품별 할인 적용 후 총액
  const totalAfterDiscount = cart.reduce(
    (sum, item) => sum + calculateItemTotal(item, cart),
    0
  );

  // 쿠폰 할인 계산
  let couponDiscount = 0;
  if (coupon) {
    if (coupon.discountType === "amount") {
      // 정액 할인: 최대 현재 총액까지만 할인
      couponDiscount = Math.min(coupon.discountValue, totalAfterDiscount);
    } else {
      // 정률 할인
      couponDiscount = Math.round(
        totalAfterDiscount * (coupon.discountValue / 100)
      );
    }
  }

  // 최종 총액 (음수가 되지 않도록)
  const finalTotal = Math.max(0, totalAfterDiscount - couponDiscount);

  return {
    totalBeforeDiscount: Math.round(totalBeforeDiscount),
    totalAfterDiscount: Math.round(totalAfterDiscount),
    couponDiscount: Math.round(couponDiscount),
    finalTotal: Math.round(finalTotal),
    totalDiscount: Math.round(totalBeforeDiscount - finalTotal),
  };
}

/**
 * 수량 변경
 * @param cart - 현재 장바구니
 * @param productId - 상품 ID
 * @param quantity - 새로운 수량
 * @returns 업데이트된 장바구니
 */
export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  // 수량이 0 이하면 아이템 제거
  if (quantity <= 0) {
    return removeItemFromCart(cart, productId);
  }

  return cart.map((item) =>
    item.product.id === productId ? { ...item, quantity } : item
  );
}

/**
 * 상품 추가
 * @param cart - 현재 장바구니
 * @param product - 추가할 상품
 * @returns 업데이트된 장바구니
 */
export function addItemToCart(
  cart: CartItem[],
  product: ProductWithUI
): CartItem[] {
  const existingItem = cart.find((item) => item.product.id === product.id);

  if (existingItem) {
    // 기존 아이템이 있으면 수량 증가
    return updateCartItemQuantity(cart, product.id, existingItem.quantity + 1);
  }

  // 새 아이템 추가
  return [...cart, { product, quantity: 1 }];
}

/**
 * 상품 제거
 * @param cart - 현재 장바구니
 * @param productId - 제거할 상품 ID
 * @returns 업데이트된 장바구니
 */
export function removeItemFromCart(
  cart: CartItem[],
  productId: string
): CartItem[] {
  return cart.filter((item) => item.product.id !== productId);
}

/**
 * 남은 재고 계산
 * @param product - 상품 정보
 * @param cart - 현재 장바구니
 * @returns 남은 재고 수량
 */
export function getRemainingStock(
  product: ProductWithUI,
  cart: CartItem[]
): number {
  const cartItem = cart.find((item) => item.product.id === product.id);
  const usedStock = cartItem?.quantity || 0;

  return Math.max(0, product.stock - usedStock);
}

/**
 * 장바구니가 비어있는지 확인
 * @param cart - 장바구니
 * @returns 비어있으면 true
 */
export function isCartEmpty(cart: CartItem[]): boolean {
  return cart.length === 0;
}

/**
 * 총 아이템 개수 계산
 * @param cart - 장바구니
 * @returns 총 아이템 개수
 */
export function getTotalItemCount(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * 특정 상품이 장바구니에 있는지 확인
 * @param cart - 장바구니
 * @param productId - 상품 ID
 * @returns 있으면 true
 */
export function hasItemInCart(cart: CartItem[], productId: string): boolean {
  return cart.some((item) => item.product.id === productId);
}

/**
 * 재고 부족으로 주문할 수 없는 아이템들 찾기
 * @param cart - 장바구니
 * @returns 재고 부족 아이템들
 */
export function getOutOfStockItems(cart: CartItem[]): CartItem[] {
  return cart.filter((item) => {
    const remainingStock = getRemainingStock(item.product, cart);
    return remainingStock < item.quantity;
  });
}

/**
 * 장바구니 검증 (주문 가능 여부)
 * @param cart - 장바구니
 * @returns 검증 결과
 */
export function validateCart(cart: CartItem[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (isCartEmpty(cart)) {
    errors.push("장바구니가 비어있습니다.");
  }

  const outOfStockItems = getOutOfStockItems(cart);
  if (outOfStockItems.length > 0) {
    outOfStockItems.forEach((item) => {
      errors.push(`${item.product.name}의 재고가 부족합니다.`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 쿠폰 적용 가능 여부 확인
 * @param coupon - 쿠폰 정보
 * @param cartTotal - 장바구니 총액
 * @returns 적용 가능하면 true
 */
export function canApplyCoupon(coupon: Coupon, cartTotal: number): boolean {
  // 기본 검증: 장바구니에 상품이 있어야 함
  if (cartTotal <= 0) {
    return false;
  }

  // 추후 최소 주문 금액 등의 조건 추가 가능
  // if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
  //   return false;
  // }

  return true;
}
