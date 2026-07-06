export const PASSWORD_REQUIREMENTS_HINT =
  'Must be at least 8 characters with numbers and symbols';

export const PASSWORD_INVALID_MESSAGE =
  'Password must be at least 8 characters and include upper & lowercase letters, a number, and a special character.';

export function validatePassword(pw: string) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pw),
  };
  const isValid = Object.values(checks).every(Boolean);
  return { checks, isValid };
}
