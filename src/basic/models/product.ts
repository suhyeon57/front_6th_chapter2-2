import { ProductWithUI } from "../../types";
import {
  safeParseNumber,
  safeParseInt,
  isValidPrice,
  isValidStock,
  isValidProductName,
} from "../utils/validators";

export function handlePriceInput(value: string): {
  price: number;
  isValid: boolean;
  errorMessage?: string;
} {
  if (value === "") {
    return { price: 0, isValid: true };
  }

  if (!/^\d+$/.test(value)) {
    return {
      price: 0,
      isValid: false,
      errorMessage: "숫자만 입력 가능합니다",
    };
  }

  const price = safeParseNumber(value);

  if (!isValidPrice(price)) {
    return {
      price: 0,
      isValid: false,
      errorMessage: "가격은 0보다 커야 합니다",
    };
  }

  return { price, isValid: true };
}

/**
 * 재고 입력 처리 (AdminPage onChange에서 사용)
 */
export function handleStockInput(value: string): {
  stock: number;
  isValid: boolean;
  errorMessage?: string;
} {
  if (value === "") {
    return { stock: 0, isValid: true };
  }

  // 숫자만 허용
  if (!/^\d+$/.test(value)) {
    return { stock: 0, isValid: false, errorMessage: "숫자만 입력 가능합니다" };
  }

  const stock = safeParseInt(value);

  if (!isValidStock(stock)) {
    return {
      stock: 0,
      isValid: false,
      errorMessage: "재고는 0보다 커야 합니다",
    };
  }

  if (stock > 9999) {
    return {
      stock: 9999,
      isValid: false,
      errorMessage: "재고는 9999개를 초과할 수 없습니다",
    };
  }

  return { stock, isValid: true };
}

/**
 * 가격 검증 (AdminPage onBlur에서 사용)
 */
export function validatePrice(value: string): {
  isValid: boolean;
  correctedPrice: number;
  errorMessage?: string;
} {
  const price = safeParseNumber(value);

  if (!isValidPrice(price)) {
    return {
      isValid: false,
      correctedPrice: 0,
      errorMessage: "가격은 0보다 큰 숫자여야 합니다",
    };
  }
  return { isValid: true, correctedPrice: price };
}

/**
 * 재고 검증 (AdminPage onBlur에서 사용)
 */
export function validateStock(value: string): {
  isValid: boolean;
  correctedStock: number;
  errorMessage?: string;
} {
  const stock = safeParseInt(value);

  if (!isValidStock(stock)) {
    return {
      isValid: false,
      correctedStock: 0,
      errorMessage: "재고는 0보다 커야 합니다",
    };
  }

  if (stock > 9999) {
    return {
      isValid: false,
      correctedStock: 9999,
      errorMessage: "재고는 9999개를 초과할 수 없습니다",
    };
  }

  return { isValid: true, correctedStock: stock };
}

/**
 * 상품 폼 전체 검증
 */
export function validateProductForm(formData: {
  name: string;
  price: number;
  stock: number;
  description: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidProductName(formData.name)) {
    if (!formData.name.trim()) {
      errors.push("상품명을 입력해주세요");
    }
  }

  if (!isValidPrice(formData.price)) {
    errors.push("가격은 0보다 커야 합니다");
  }
  if (!isValidStock(formData.stock)) {
    errors.push("재고는 0보다 커야 합니다");
  }

  if (formData.stock > 9999) {
    errors.push("재고는 9999개를 초과할 수 없습니다");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 재고 상태 표시용 클래스 계산
 */
export function getStockStatusClass(stock: number): string {
  if (stock > 10) {
    return "bg-green-100 text-green-800";
  } else if (stock > 0) {
    return "bg-yellow-100 text-yellow-800";
  } else {
    return "bg-red-100 text-red-800";
  }
}
export function getProductBadgeInfo(product: ProductWithUI) {
  return {
    showRecommended: product.isRecommended,
    recommendedText: "BEST",
    recommendedStyle: "bg-red-500 text-white text-xs px-2 py-1 rounded",

    showDiscount: product.discounts.length > 0,
    discountStyle: "bg-orange-500 text-white text-xs px-2 py-1 rounded",
  };
}

/**
 * 최대 할인율 반환
 */
export function getMaxDiscountRate(product: ProductWithUI): number {
  if (product.discounts.length === 0) return 0;
  return Math.max(...product.discounts.map((d) => d.rate)) * 100;
}

/**
 * 재고 표시 정보 반환
 */
export function getStockDisplayInfo(remainingStock: number) {
  const isOutOfStock = remainingStock <= 0;
  const isLowStock = remainingStock <= 5 && remainingStock > 0;
  const isNormalStock = remainingStock > 5;

  if (isOutOfStock) {
    return {
      shouldShow: false,
      isOutOfStock: true,
      message: "",
      textColor: "",
    };
  }

  if (isLowStock) {
    return {
      shouldShow: true,
      isOutOfStock: false,
      message: `품절임박! ${remainingStock}개 남음`,
      textColor: "text-red-600",
    };
  }

  if (isNormalStock) {
    return {
      shouldShow: true,
      isOutOfStock: false,
      message: `재고 ${remainingStock}개`,
      textColor: "text-gray-500",
    };
  }

  return {
    shouldShow: false,
    isOutOfStock: false,
    message: "",
    textColor: "",
  };
}

/**
 * 할인 정보 표시 여부 확인
 */
export function shouldShowDiscountInfo(product: ProductWithUI): boolean {
  return product.discounts.length > 0;
}

/**
 * 할인 정보 텍스트 생성
 */
export function getDiscountDisplayText(discount: {
  quantity: number;
  rate: number;
}): string {
  return `${discount.quantity}개 이상 구매시 할인 ${discount.rate * 100}%`;
}

/**
 * 가격 포맷팅 (기존 함수 활용)
 */
export function formatProductPrice(
  price: number,
  productId: string,
  formatPriceFunction: (price: number, productId?: string) => string
): string {
  return formatPriceFunction(price, productId);
}
