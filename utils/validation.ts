// ============================================
// Validation Utilities for TripBuddy
// ============================================

// Validation Regex Patterns
export const REGEX = {
  // Email: Standard email format
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,

  // Name: Alphabetic characters only (including spaces), min 2 chars
  NAME: /^[a-zA-Z\s]{2,}$/,

  // Phone: International format (optional)
  PHONE: /^\+?[1-9]\d{1,14}$/,
};

// Validation Error Messages
export const VALIDATION_ERRORS = {
  email: {
    required: "Email is required",
    invalid: "Please enter a valid email address",
    exists: "This email is already registered. Please sign in instead.",
    notFound: "No account found with this email. Please sign up first.",
  },
  password: {
    required: "Password is required",
    weak: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character",
    mismatch: "Passwords do not match",
  },
  name: {
    required: "Name is required",
    invalid: "Name must contain only letters (minimum 2 characters)",
  },
  general: {
    networkError: "Network error. Please check your internet connection.",
    rateLimited: "Too many attempts. Please try again in {time} seconds.",
    unknownError: "An unexpected error occurred. Please try again.",
  },
};

// Validation Result Interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================
// Individual Field Validators
// ============================================

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: VALIDATION_ERRORS.email.required };
  }

  if (!REGEX.EMAIL.test(email.trim())) {
    return { isValid: false, error: VALIDATION_ERRORS.email.invalid };
  }

  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { isValid: false, error: VALIDATION_ERRORS.password.required };
  }

  if (!REGEX.PASSWORD.test(password)) {
    return { isValid: false, error: VALIDATION_ERRORS.password.weak };
  }

  return { isValid: true };
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { isValid: false, error: "Please confirm your password" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: VALIDATION_ERRORS.password.mismatch };
  }

  return { isValid: true };
};

export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: VALIDATION_ERRORS.name.required };
  }

  if (!REGEX.NAME.test(name.trim())) {
    return { isValid: false, error: VALIDATION_ERRORS.name.invalid };
  }

  return { isValid: true };
};

// ============================================
// Form Validators
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export const validateLoginForm = (
  data: LoginFormData
): { isValid: boolean; errors: LoginFormErrors } => {
  const errors: LoginFormErrors = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  // For login, we just check if password is provided (not the full regex)
  if (!data.password || data.password.length === 0) {
    errors.password = VALIDATION_ERRORS.password.required;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const validateSignupForm = (
  data: SignupFormData
): { isValid: boolean; errors: SignupFormErrors } => {
  const errors: SignupFormErrors = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  }

  const passwordResult = validatePassword(data.password);
  if (!passwordResult.isValid) {
    errors.password = passwordResult.error;
  }

  const confirmResult = validateConfirmPassword(
    data.password,
    data.confirmPassword
  );
  if (!confirmResult.isValid) {
    errors.confirmPassword = confirmResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export interface ProfileFormData {
  name: string;
}

export interface ProfileFormErrors {
  name?: string;
}

export const validateProfileForm = (
  data: ProfileFormData
): { isValid: boolean; errors: ProfileFormErrors } => {
  const errors: ProfileFormErrors = {};

  const nameResult = validateName(data.name);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================
// Real-time Validation Helpers
// ============================================

export const getPasswordStrength = (
  password: string
): {
  strength: "weak" | "fair" | "good" | "strong";
  percentage: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push("At least 8 characters");
  }

  if (/[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("1 uppercase letter");
  }

  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push("1 lowercase letter");
  }

  if (/\d/.test(password)) {
    score += 20;
  } else {
    feedback.push("1 number");
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else {
    feedback.push("1 special character");
  }

  let strength: "weak" | "fair" | "good" | "strong";
  if (score < 40) {
    strength = "weak";
  } else if (score < 70) {
    strength = "fair";
  } else if (score < 100) {
    strength = "good";
  } else {
    strength = "strong";
  }

  return { strength, percentage: Math.min(score, 100), feedback };
};

// ============================================
// Rate Limiting
// ============================================

const LOGIN_ATTEMPT_KEY = "@tripbuddy/login_attempts";
const LOCKOUT_KEY = "@tripbuddy/lockout_until";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutSeconds?: number;
}

export const checkRateLimit = async (): Promise<RateLimitResult> => {
  try {
    const lockoutUntil = await AsyncStorage.getItem(LOCKOUT_KEY);

    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil, 10);
      const now = Date.now();

      if (now < lockoutTime) {
        const remainingSeconds = Math.ceil((lockoutTime - now) / 1000);
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutSeconds: remainingSeconds,
        };
      } else {
        // Lockout expired, clear it
        await AsyncStorage.removeItem(LOCKOUT_KEY);
        await AsyncStorage.removeItem(LOGIN_ATTEMPT_KEY);
      }
    }

    const attemptsStr = await AsyncStorage.getItem(LOGIN_ATTEMPT_KEY);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    return {
      allowed: attempts < MAX_ATTEMPTS,
      remainingAttempts: MAX_ATTEMPTS - attempts,
    };
  } catch {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
};

export const recordFailedAttempt = async (): Promise<RateLimitResult> => {
  try {
    const attemptsStr = await AsyncStorage.getItem(LOGIN_ATTEMPT_KEY);
    const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;

    await AsyncStorage.setItem(LOGIN_ATTEMPT_KEY, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - attempts,
    };
  } catch {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
};

export const resetRateLimit = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LOGIN_ATTEMPT_KEY);
    await AsyncStorage.removeItem(LOCKOUT_KEY);
  } catch {
    // Ignore errors
  }
};
