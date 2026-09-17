/**
 * Simple, robust Code 128-B SVG barcode generator.
 * Produces crisp SVG vector barcodes for 58mm/80mm thermal receipts and A4 invoices.
 */

// Code 128 Code B pattern table
const CODE128_PATTERNS: { [key: number]: string } = {
  0: '212222', 1: '222122', 2: '222221', 3: '121223', 4: '121322',
  5: '131222', 6: '122213', 7: '122312', 8: '132212', 9: '221213',
  10: '221312', 11: '231212', 12: '112232', 13: '122132', 14: '122231',
  15: '113222', 16: '123122', 17: '123221', 18: '223211', 19: '221132',
  20: '221231', 21: '213212', 22: '223112', 23: '312131', 24: '311222',
  25: '321122', 26: '321221', 27: '312212', 28: '322112', 29: '322211',
  30: '212123', 31: '212321', 32: '232121', 33: '111323', 34: '131123',
  35: '131321', 36: '112313', 37: '132113', 38: '132311', 39: '211313',
  40: '231113', 41: '231311', 42: '112133', 43: '112331', 44: '132131',
  45: '113123', 46: '113321', 47: '133121', 48: '313121', 49: '211331',
  50: '231131', 51: '213113', 52: '213311', 53: '213131', 54: '311123',
  55: '311321', 56: '331121', 57: '312113', 58: '312311', 59: '332111',
  60: '314111', 61: '221411', 62: '431111', 63: '111224', 64: '111422',
  65: '121124', 66: '121421', 67: '141122', 68: '141221', 69: '112214',
  70: '112412', 71: '122114', 72: '122411', 73: '142112', 74: '142211',
  75: '241211', 76: '221114', 77: '413111', 78: '241112', 79: '134111',
  80: '111242', 81: '121142', 82: '121241', 83: '114212', 84: '124112',
  85: '124211', 86: '411212', 87: '421112', 88: '421211', 89: '212141',
  90: '214121', 91: '412121', 92: '111143', 93: '111341', 94: '131141',
  95: '114113', 96: '114311', 97: '411113', 98: '411311', 99: '113141',
  100: '114131', 101: '311141', 102: '411131', 103: '211412', // Start Code B
  104: '211214', // Start Code A
  105: '211232', // Start Code C
  106: '2331112', // Stop
};

export function generateBarcodeSvg(text: string, height: number = 44, includeText: boolean = true): string {
  if (!text) return '';
  const clean = text.replace(/[^A-Za-z0-9\-_.]/g, '').substring(0, 24);
  const startCodeB = 104;
  let checksum = startCodeB;
  const values: number[] = [startCodeB];

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 32;
    const val = Math.max(0, Math.min(charCode, 95));
    values.push(val);
    checksum += val * (i + 1);
  }

  const checkCode = checksum % 103;
  values.push(checkCode);
  values.push(106); // Stop

  let patternStr = '';
  for (const v of values) {
    patternStr += CODE128_PATTERNS[v] || '212222';
  }

  let totalWidth = 0;
  for (let i = 0; i < patternStr.length; i++) {
    totalWidth += parseInt(patternStr[i], 10);
  }

  let x = 10;
  const barElements: string[] = [];
  const svgHeight = height + (includeText ? 16 : 4);

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10) * 1.5;
    const isBar = i % 2 === 0;
    if (isBar) {
      barElements.push(`<rect x="${x}" y="2" width="${width}" height="${height}" fill="#000" />`);
    }
    x += width;
  }

  const totalSvgWidth = x + 10;
  const textSvg = includeText
    ? `<text x="${totalSvgWidth / 2}" y="${height + 14}" font-family="'JetBrains Mono', monospace" font-size="11" text-anchor="middle" fill="#000" font-weight="600">${clean}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSvgWidth} ${svgHeight}" width="100%" height="${svgHeight}px" style="max-width: ${Math.min(totalSvgWidth, 340)}px; margin: 0 auto; display: block;">
    <rect width="100%" height="100%" fill="#ffffff"/>
    ${barElements.join('')}
    ${textSvg}
  </svg>`;
}
