export interface PasswordStrength {
  isValid: boolean;
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  return {
    isValid: password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  const validCriteria = [
    strength.hasMinLength,
    strength.hasUpperCase,
    strength.hasLowerCase,
    strength.hasNumber,
    strength.hasSpecialChar
  ].filter(Boolean).length;

  if (validCriteria <= 2) return 'text-red-500';
  if (validCriteria <= 4) return 'text-yellow-500';
  return 'text-green-500';
} 