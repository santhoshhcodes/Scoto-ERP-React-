/**
 * Converts any numeric amount to Indian Currency words.
 * Example: 15420.50 -> "RUPEES FIFTEEN THOUSAND FOUR HUNDRED TWENTY AND PAISE FIFTY ONLY"
 */
export function numToIndianWords(amount) {
  const val = Math.round(Number(amount || 0) * 100) / 100;
  if (!val || isNaN(val)) return 'RUPEES ZERO ONLY';

  const integerPart = Math.floor(Math.abs(val));
  const paisePart = Math.round((Math.abs(val) - integerPart) * 100);

  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
  ];

  const tens = [
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
  ];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return (tens[t] + (o ? ' ' + ones[o] : '')).trim();
  }

  function threeDigits(n) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [];
    if (h) parts.push(ones[h] + ' HUNDRED');
    if (rest) parts.push(twoDigits(rest));
    return parts.join(' ').trim();
  }

  let num = integerPart;
  const parts = [];

  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  if (crores) parts.push(twoDigits(crores) + ' CRORE');

  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  if (lakhs) parts.push(twoDigits(lakhs) + ' LAKH');

  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands) parts.push(twoDigits(thousands) + ' THOUSAND');

  const hundreds = num;
  if (hundreds) parts.push(threeDigits(hundreds));

  let words = parts.join(' ').trim();
  if (!words) words = 'ZERO';

  let result = 'RUPEES ' + words;
  if (paisePart > 0) {
    result += ' AND PAISE ' + twoDigits(paisePart);
  }
  result += ' ONLY';

  return result;
}

export default numToIndianWords;
