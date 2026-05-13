/**
 * Format date as dd/MM/yyyy
 */
export const formatOrderDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format currency to Vietnamese format (VND)
 * Example: 200000 -> 200.000 đ
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 đ';
  const formatted = Math.floor(amount).toLocaleString('vi-VN');
  return `${formatted} đ`;
};

/**
 * Format order summary text with item count
 * Example: "200.000 đ cho 1 mục" or "200.000 đ cho 3 mục"
 */
export const formatOrderSummary = (amount, itemCount) => {
  const currencyStr = formatCurrency(amount);
  const itemText = itemCount === 1 ? 'mục' : 'mục';
  return `${currencyStr} cho ${itemCount} ${itemText}`;
};

/**
 * Mask a Steam key for display
 * Example: ABCDE-FGHIJ-KLMNO-PQRST-UVWXY -> •••••-•••••-•••••-•••••-•••••
 */
export const maskSteamKey = (key) => {
  if (!key) return '';
  return key
    .split('-')
    .map(() => '•••••')
    .join('-');
};
