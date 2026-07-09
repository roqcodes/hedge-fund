const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

function twoDigits(value: number): string {
  if (value < 20) return ONES[value] ?? '';
  const tens = TENS[Math.floor(value / 10)] ?? '';
  const ones = value % 10;
  return ones ? `${tens} ${ONES[ones]}` : tens;
}

function threeDigits(value: number): string {
  if (value === 0) return '';
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (remainder > 0) parts.push(twoDigits(remainder));
  return parts.join(' ');
}

/** Lowercase Indian English words for an INR integer amount, e.g. "twelve thousand five hundred". */
export function formatInrAmountInWords(amount: number): string {
  const value = Math.round(Math.abs(amount));
  if (!Number.isFinite(value) || value === 0) return 'zero';

  const prefix = amount < 0 ? 'minus ' : '';
  const parts: string[] = [];

  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const remainder = value % 1_000;

  if (crore > 0) parts.push(`${twoDigits(crore)} crore`);
  if (lakh > 0) parts.push(`${twoDigits(lakh)} lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} thousand`);
  if (remainder > 0) parts.push(threeDigits(remainder));

  return `${prefix}${parts.join(' ')}`.trim();
}
