export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

export const getEmailError = (email) => {
  if (!email) {
    return 'Email is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const getPasswordError = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (!validatePassword(password)) {
    return 'Password must be at least 6 characters';
  }
  return '';
};

export const getConfirmPasswordError = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (!validatePasswordMatch(password, confirmPassword)) {
    return 'Passwords do not match';
  }
  return '';
};
