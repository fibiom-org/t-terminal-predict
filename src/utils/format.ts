export function shortAddress(address: string): string {
  if (!address.startsWith('0x') || address.length < 11) return address;
  return `${address.slice(0, 4)}..${address.slice(-2)}`;
}

export function trimDecimals(value: string, min = 2): string {
  if (!value.includes('.')) return value;
  let [int, frac = ''] = value.split('.');
  frac = frac.replace(/0+$/, '');
  while (frac.length < min) frac += '0';
  return frac.length > 0 ? `${int}.${frac}` : (int ?? '0');
}
