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
    return 'Email không được để trống';
  }
  if (!validateEmail(email)) {
    return 'Vui lòng nhập địa chỉ email hợp lệ';
  }
  return '';
};

export const getPasswordError = (password) => {
  if (!password) {
    return 'Mật khẩu không được để trống';
  }
  if (!validatePassword(password)) {
    return 'Mật khẩu phải có ít nhất 6 ký tự';
  }
  return '';
};

export const getConfirmPasswordError = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận mật khẩu';
  }
  if (!validatePasswordMatch(password, confirmPassword)) {
    return 'Mật khẩu không khớp';
  }
  return '';
};
