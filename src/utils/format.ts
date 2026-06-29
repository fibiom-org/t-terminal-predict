export function shortAddress(address: string): string {
  if (address.startsWith('0x')) {
    return address.length < 11 ? address : `${address.slice(0, 4)}..${address.slice(-2)}`;
  }
  return address.length <= 13 ? address : `${address.slice(0, 6)}..${address.slice(-4)}`;
}

export function trimDecimals(value: string, min = 2): string {
  if (!value.includes('.')) return value;
  let [int, frac = ''] = value.split('.');
  frac = frac.replace(/0+$/, '');
  while (frac.length < min) frac += '0';
  return frac.length > 0 ? `${int}.${frac}` : (int ?? '0');
}
