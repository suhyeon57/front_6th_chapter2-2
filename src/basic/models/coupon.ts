import { Coupon } from "../../types";

// ===== 기존 함수들 (이미 있음) =====
// export function createCoupon(formData) { ... }
// export function deleteCoupon(coupons, couponCode) { ... }
// export function findCouponByCode(coupons, code) { ... }

// ===== AdminPage에서 분리할 새로운 함수들 =====

/**
 * 쿠폰 코드 입력 처리 (AdminPage onChange에서 사용)
 */
export function handleCouponCodeInput(value: string): string {
  // 대문자 변환 + 영문/숫자만 허용
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * 할인값 입력 처리 (AdminPage onChange에서 사용)
 */
export function handleDiscountValueInput(
  value: string,
  discountType: "amount" | "percentage"
): {
  discountValue: number;
  isValid: boolean;
  errorMessage?: string;
} {
  if (value === "") {
    return { discountValue: 0, isValid: true };
  }

  // 숫자만 허용
  if (!/^\d+$/.test(value)) {
    return {
      discountValue: 0,
      isValid: false,
      errorMessage: "숫자만 입력 가능합니다",
    };
  }

  const discountValue = parseInt(value);

  // 타입별 상한선 체크
  if (discountType === "percentage" && discountValue > 100) {
    return {
      discountValue: 100,
      isValid: false,
      errorMessage: "할인율은 100%를 초과할 수 없습니다",
    };
  }

  if (discountType === "amount" && discountValue > 100000) {
    return {
      discountValue: 100000,
      isValid: false,
      errorMessage: "할인 금액은 100,000원을 초과할 수 없습니다",
    };
  }

  return { discountValue, isValid: true };
}

/**
 * 할인값 검증 (AdminPage onBlur에서 사용)
 */
export function validateDiscountValue(
  value: string,
  discountType: "amount" | "percentage"
): {
  isValid: boolean;
  correctedValue: number;
  errorMessage?: string;
} {
  const discountValue = parseInt(value) || 0;

  if (discountType === "percentage") {
    if (discountValue > 100) {
      return {
        isValid: false,
        correctedValue: 100,
        errorMessage: "할인율은 100%를 초과할 수 없습니다",
      };
    }
    if (discountValue < 0) {
      return {
        isValid: false,
        correctedValue: 0,
        errorMessage: "할인율은 0% 이상이어야 합니다",
      };
    }
  } else {
    if (discountValue > 100000) {
      return {
        isValid: false,
        correctedValue: 100000,
        errorMessage: "할인 금액은 100,000원을 초과할 수 없습니다",
      };
    }
    if (discountValue < 0) {
      return {
        isValid: false,
        correctedValue: 0,
        errorMessage: "할인 금액은 0원 이상이어야 합니다",
      };
    }
  }

  return { isValid: true, correctedValue: discountValue };
}

/**
 * 쿠폰 폼 전체 검증
 */
export function validateCouponForm(formData: {
  name: string;
  code: string;
  discountType: "amount" | "percentage";
  discountValue: number;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!formData.name.trim()) {
    errors.push("쿠폰명을 입력해주세요");
  }

  if (!formData.code.trim()) {
    errors.push("쿠폰 코드를 입력해주세요");
  }

  if (formData.discountValue <= 0) {
    errors.push("할인값은 0보다 커야 합니다");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 쿠폰 설명 포맷팅 (AdminPage에서 사용)
 */
export function formatCouponDescription(coupon: Coupon): string {
  if (coupon.discountType === "amount") {
    return `${coupon.discountValue.toLocaleString()}원 할인`;
  } else {
    return `${coupon.discountValue}% 할인`;
  }
}
