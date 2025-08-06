import { ProductWithUI } from "../../types";

// ===== 기존 함수들 (이미 있음) =====
// export function createProduct(formData) { ... }
// export function updateProduct(products, productId, formData) { ... }
// export function deleteProduct(products, productId) { ... }

// ===== AdminPage에서 분리할 새로운 함수들 =====

/**
 * 가격 입력 처리 (AdminPage onChange에서 사용)
 */
export function handlePriceInput(value: string): {
  price: number;
  isValid: boolean;
  errorMessage?: string;
} {
  if (value === "") {
    return { price: 0, isValid: true };
  }

  // 숫자만 허용
  if (!/^\d+$/.test(value)) {
    return { price: 0, isValid: false, errorMessage: "숫자만 입력 가능합니다" };
  }

  const price = parseInt(value);

  if (price < 0) {
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

  const stock = parseInt(value);

  if (stock < 0) {
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
  const price = parseInt(value) || 0;

  if (price < 0) {
    return {
      isValid: false,
      correctedPrice: 0,
      errorMessage: "가격은 0보다 커야 합니다",
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
  const stock = parseInt(value) || 0;

  if (stock < 0) {
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

  if (!formData.name.trim()) {
    errors.push("상품명을 입력해주세요");
  }

  if (formData.price <= 0) {
    errors.push("가격은 0보다 커야 합니다");
  }

  if (formData.stock < 0) {
    errors.push("재고는 0보다 크거나 같아야 합니다");
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
