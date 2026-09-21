export interface ThermalLogoPreset {
  id: string;
  name: string;
  urduName: string;
  description: string;
  svgDataUri: string;
}

export const THERMAL_LOGO_PRESETS: ThermalLogoPreset[] = [
  {
    id: 'crown-crest',
    name: 'Royal Crown Crest',
    urduName: 'شاہی تاج لوگو',
    description: 'Crisp monochrome royal crest with stars and bold typography',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
        <rect width="240" height="70" fill="none"/>
        <!-- Crown Motif -->
        <path d="M120 4 L126 18 L138 12 L132 26 L108 26 L102 12 L114 18 Z" fill="#000" stroke="#000" stroke-width="1.5"/>
        <circle cx="102" cy="11" r="2" fill="#000"/>
        <circle cx="120" cy="3" r="2.5" fill="#000"/>
        <circle cx="138" cy="11" r="2" fill="#000"/>
        <!-- Stars -->
        <text x="75" y="24" font-family="monospace" font-size="12" font-weight="900" fill="#000" text-anchor="middle">★ ★</text>
        <text x="165" y="24" font-family="monospace" font-size="12" font-weight="900" fill="#000" text-anchor="middle">★ ★</text>
        <!-- Border Frame -->
        <line x1="20" y1="32" x2="220" y2="32" stroke="#000" stroke-width="2"/>
        <line x1="20" y1="35" x2="220" y2="35" stroke="#000" stroke-width="0.8"/>
        <!-- Title -->
        <text x="120" y="50" font-family="sans-serif, Arial" font-size="14" font-weight="900" letter-spacing="1.5" fill="#000" text-anchor="middle">NEW SAJJAD ZARI</text>
        <!-- Subtitle -->
        <text x="120" y="63" font-family="sans-serif, Arial" font-size="8.5" font-weight="700" letter-spacing="3" fill="#000" text-anchor="middle">CORPORATION • LAHORE</text>
      </svg>
    `)}`,
  },
  {
    id: 'golden-loom',
    name: 'Embroidery Needle & Loom',
    urduName: 'کڑھائی اور زری لوم',
    description: 'Heritage craft motif with embroidery needles and thread spool',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
        <rect width="240" height="70" fill="none"/>
        <!-- Needle & Reel Icon -->
        <g transform="translate(120, 16) scale(0.9)">
          <circle cx="0" cy="0" r="14" fill="none" stroke="#000" stroke-width="2"/>
          <path d="M-8 -6 L8 6 M-8 6 L8 -6" stroke="#000" stroke-width="2"/>
          <circle cx="0" cy="0" r="4" fill="#000"/>
        </g>
        <line x1="15" y1="16" x2="95" y2="16" stroke="#000" stroke-width="1.5"/>
        <line x1="145" y1="16" x2="225" y2="16" stroke="#000" stroke-width="1.5"/>
        <text x="120" y="48" font-family="sans-serif, Arial" font-size="13.5" font-weight="900" letter-spacing="1.2" fill="#000" text-anchor="middle">SAJJAD ZARI &amp; LACES</text>
        <text x="120" y="62" font-family="sans-serif, Arial" font-size="8" font-weight="700" letter-spacing="2" fill="#000" text-anchor="middle">PREMIUM METALLIC THREADS</text>
      </svg>
    `)}`,
  },
  {
    id: 'paisley-motif',
    name: 'Traditional Paisley Monogram',
    urduName: 'روایتی بوٹی اور فریم',
    description: 'Eastern ornamental paisley emblem designed for clear thermal print',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
        <rect width="240" height="70" fill="none"/>
        <!-- Geometric Badge Frame -->
        <rect x="25" y="6" width="190" height="58" rx="6" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="8,2"/>
        <text x="120" y="24" font-family="sans-serif, Arial" font-size="9" font-weight="800" letter-spacing="3" fill="#000" text-anchor="middle">❖ ESTABLISHED 1998 ❖</text>
        <text x="120" y="44" font-family="sans-serif, Arial" font-size="14.5" font-weight="900" letter-spacing="1" fill="#000" text-anchor="middle">NEW SAJJAD ZARI</text>
        <text x="120" y="57" font-family="sans-serif, Arial" font-size="8" font-weight="600" letter-spacing="1.5" fill="#000" text-anchor="middle">MADINA ZARI MARKET • SHAH ALAM</text>
      </svg>
    `)}`,
  },
  {
    id: 'diamond-seal',
    name: 'Diamond Luxury Seal',
    urduName: 'ڈائمنڈ سیل لوگو',
    description: 'High-contrast geometric diamond insignia with double borders',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
        <rect width="240" height="70" fill="none"/>
        <!-- Diamond Motif -->
        <polygon points="120,4 134,18 120,32 106,18" fill="none" stroke="#000" stroke-width="2"/>
        <polygon points="120,9 129,18 120,27 111,18" fill="#000"/>
        <line x1="20" y1="18" x2="95" y2="18" stroke="#000" stroke-width="1.2"/>
        <line x1="145" y1="18" x2="220" y2="18" stroke="#000" stroke-width="1.2"/>
        <text x="120" y="49" font-family="sans-serif, Arial" font-size="14" font-weight="900" letter-spacing="2" fill="#000" text-anchor="middle">SAJJAD ZARI CORP</text>
        <text x="120" y="63" font-family="sans-serif, Arial" font-size="8" font-weight="700" letter-spacing="2" fill="#000" text-anchor="middle">WHOLESALE &amp; RETAIL</text>
      </svg>
    `)}`,
  },
  {
    id: 'monogram-crest',
    name: 'Classic Monogram Stamp',
    urduName: 'کلاسیک مونوگرام اسٹیمپ',
    description: 'Circular NSZC typography seal with bold outer ring',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
        <rect width="240" height="70" fill="none"/>
        <circle cx="120" cy="18" r="14" fill="#000"/>
        <text x="120" y="23" font-family="sans-serif, Arial" font-size="10" font-weight="900" fill="#FFF" text-anchor="middle">NSZC</text>
        <text x="120" y="48" font-family="sans-serif, Arial" font-size="13" font-weight="900" letter-spacing="1.5" fill="#000" text-anchor="middle">NEW SAJJAD ZARI</text>
        <text x="120" y="62" font-family="sans-serif, Arial" font-size="8.5" font-weight="700" letter-spacing="2" fill="#000" text-anchor="middle">AUTHENTIC EMBROIDERY GOODS</text>
      </svg>
    `)}`,
  },
];
