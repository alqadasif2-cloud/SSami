/**
 * Money utilities using integer minor units (cents) to avoid any floating-point arithmetic errors.
 */

export function normalizeArabicDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return result;
}

export function parseMoneyToCents(rawInput: string): {
  valid: boolean;
  cents?: number;
  error?: string;
} {
  const trimmed = normalizeArabicDigits(rawInput.trim().replace(/[\$،]/g, ','));
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال نتيجة الصفقة.' };
  }

  // Handle standard decimal dot
  const normalized = trimmed.replace(',', '.');

  // Match optional leading + or -, followed by numbers, optional . and up to 2 decimals
  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { valid: false, error: 'يرجى إدخال رقم صحيح.' };
  }

  const sign = match[1] === '-' ? -1 : 1;
  const whole = parseInt(match[2], 10);
  const fraction = match[3] ? match[3].padEnd(2, '0') : '00';
  const fracNumber = parseInt(fraction.slice(0, 2), 10);

  const totalCents = sign * (whole * 100 + fracNumber);

  if (totalCents === 0) {
    return { valid: false, error: 'لا يمكن أن تكون نتيجة الصفقة صفراً.' };
  }

  return { valid: true, cents: totalCents };
}

export function parseCapitalToCents(rawInput: string): {
  valid: boolean;
  cents?: number;
  error?: string;
} {
  const trimmed = normalizeArabicDigits(rawInput.trim().replace(/[\$،]/g, ','));
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال قيمة صحيحة.' };
  }

  const normalized = trimmed.replace(',', '.');
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { valid: false, error: 'يرجى إدخال رقم صحيح أكبر من صفر.' };
  }

  const whole = parseInt(match[1], 10);
  const fraction = match[2] ? match[2].padEnd(2, '0') : '00';
  const fracNumber = parseInt(fraction.slice(0, 2), 10);

  const totalCents = whole * 100 + fracNumber;

  if (totalCents <= 0) {
    return { valid: false, error: 'يجب أن تكون القيمة أكبر من صفر.' };
  }

  return { valid: true, cents: totalCents };
}

export function formatMoney(
  cents: number | null | undefined,
  options?: {
    showSign?: boolean;
    compact?: boolean;
    showDollar?: boolean;
  }
): string {
  if (cents === null || cents === undefined) {
    return '-';
  }

  const { showSign = false, showDollar = true } = options || {};
  const isNegative = cents < 0;
  const isPositive = cents > 0;
  const absCents = Math.abs(cents);

  const dollars = Math.floor(absCents / 100);
  const remainderCents = absCents % 100;
  const formattedNumber = `${dollars.toLocaleString('en-US')}.${remainderCents.toString().padStart(2, '0')}`;

  const dollarPrefix = showDollar ? '$' : '';

  if (isNegative) {
    return `-${dollarPrefix}${formattedNumber}`;
  } else if (isPositive && showSign) {
    return `+${dollarPrefix}${formattedNumber}`;
  } else {
    return `${dollarPrefix}${formattedNumber}`;
  }
}

export function calculateProgress(currentCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  if (currentCents <= 0) return 0;
  const pct = (currentCents / targetCents) * 100;
  return Math.min(Math.max(pct, 0), 100);
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
