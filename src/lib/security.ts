import { VALIDATION } from "./constants";

export function sanitizeInput(input: string): string {
  if (!input) {
    return "";
  }

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/\s*on\w+\s*=\s*["']?[^"'>]*["']?/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/expression\s*\(/gi, "")
    .trim();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { valid: false, error: "Kata sandi minimal 6 karakter" };
  }

  return { valid: true };
}

export function validateRequired(
  value: string,
  fieldName: string
): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} wajib diisi` };
  }

  return { valid: true };
}

export function validateUserType(type: string): type is "sme" | "influencer" {
  return type === "sme" || type === "influencer";
}
