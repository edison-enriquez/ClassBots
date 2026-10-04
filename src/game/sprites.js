/* Pixel art del taller: fuente 3×5, sprites como mapas de caracteres y paletas. */

export const W = 192, H = 112;

export const P = {
  ink: '#1b1030', steel: '#8b93a7', steelD: '#5b6178', eye: '#f5f5ff',
  panel: '#2a2347', on: '#ff4d6d', off: '#3b3550', gold: '#ffcc33', green: '#4ade80', amber: '#ffb020', red: '#ff5470',
  paper: '#1d4b86', paperL: '#2a5fa3', paperXL: '#3f78bf', line: '#9fd8ff',
  wall: '#2a2147', wallL: '#362b5c', wallD: '#1e1836', floor: '#3a3358', floorL: '#4a4270', floorD: '#2b2546', pipe: '#59507f',
  beam: '#ffe9a3', smoke: '#8d88a8', white: '#ffffff',
};

export const COLORES = {
  azul: '#4aa3ff', rojo: '#ff5d5d', verde: '#45d483', amarillo: '#ffd23f', morado: '#b58cff', naranja: '#ff9a3c',
  rosado: '#ff8fc7', rosa: '#ff8fc7', cian: '#3fe0e0', gris: '#9aa7b8', blanco: '#eef2f7', negro: '#4a4f5c', cafe: '#a0703c', café: '#a0703c',
};

export function colorDe(c) {
  if (c == null) return null;
  const k = String(c).toLowerCase().trim();
  if (COLORES[k]) return COLORES[k];
  if (/^#[0-9a-f]{6}$/i.test(k)) return k;
  return '#9aa7b8';
}
export function mezclar(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const ob = f > 0 ? 255 : 0, a = Math.abs(f);
  r = Math.round(r + (ob - r) * a); g = Math.round(g + (ob - g) * a); b = Math.round(b + (ob - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/* ---------- Fuente 3×5 ---------- */
const G = {
  'A': '.#.#.#####.##.#',
  'B': '##.#.###.#.###.',
  'C': '.###..#..#...##',
  'D': '##.#.##.##.###.',
  'E': '####..##.#..###',
  'F': '####..##.#..#..',
  'G': '.###..#.##.#.##',
  'H': '#.##.#####.##.#',
  'I': '###.#..#..#.###',
  'J': '..#..#..##.#.#.',
  'K': '#.##.###.#.##.#',
  'L': '#..#..#..#..###',
  'M': '#.########.##.#',
  'N': '##.#.##.##.##.#',
  'O': '.#.#.##.##.#.#.',
  'P': '##.#.###.#..#..',
  'Q': '.#.#.##.###..##',
  'R': '##.#.###.#.##.#',
  'S': '.###...#...###.',
  'T': '###.#..#..#..#.',
  'U': '#.##.##.##.####',
  'V': '#.##.##.##.#.#.',
  'W': '#.##.########.#',
  'X': '#.##.#.#.#.##.#',
  'Y': '#.##.#.#..#..#.',
  'Z': '###..#.#.#..###',
  '0': '####.##.##.####',
  '1': '.#.##..#..#.###',
  '2': '##...#.#.#..###',
  '3': '##...#.#...###.',
  '4': '#.##.####..#..#',
  '5': '####..##...###.',
  '6': '.###..####.####',
  '7': '###..#.#..#..#.',
  '8': '####.#####.####',
  '9': '####.####..###.',
  ' ': '...............',
  '.': '.............#.',
  ',': '..........#.#..',
  ':': '....#.....#....',
  '-': '......###......',
  '+': '....#.###.#....',
  '!': '.#..#..#.....#.',
  '?': '##...#.#.....#.',
  '/': '..#..#.#.#..#..',
  '(': '.#.#..#..#...#.',
  ')': '.#...#..#..#.#.',
  '"': '#.##.#.........',
  "'": '.#..#..........',
  '=': '...###...###...',
  '<': '..#.#.#...#...#',
  '>': '#...#...#.#.#..',
  '_': '............###',
  '#': '#.#####.#####.#',
  '%': '#.#..#.#.#..#.#',
  '*': '#.#.#.###.#.#.#',
  '[': '##.#..#..#..##.',
  ']': '.##..#..#..#.##',
  ';': '....#.....#.#..',
  '{': '.##.#.##..#..##',
  '}': '##..#..##.#.##.',
};

const SIN_TILDE = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U', Ñ: 'N' };
export function texto(ctx, s, x, y, color, { centrar = false, sombra = null } = {}) {
  s = String(s).toUpperCase().replace(/[ÁÉÍÓÚÜÑ]/g, c => SIN_TILDE[c]);
  const ancho = s.length * 4 - 1;
  let cx = Math.round(centrar ? x - ancho / 2 : x);
  if (sombra) texto(ctx, s, cx + 1, y + 1, sombra);
  ctx.fillStyle = color;
  for (const ch of s) {
    const g = G[ch] || G['?'];
    for (let i = 0; i < 15; i++) if (g[i] === '#') ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1);
    cx += 4;
  }
  return ancho;
}
export const anchoTexto = s => String(s).length * 4 - 1;

/* ---------- Sprites ---------- */
export const ROBOT = [
  '.......aa.......',
  '.......ss.......',
  '...kkkkkkkkkk...',
  '..kHHHHHHHHHHk..',
  '..kHBBBBBBBBBk..',
  '..kBeeBBBBeeBk..',
  '..kBeoBBBBeoBk..',
  '..kBBBBBBBBBBk..',
  '..kBBBmmmmBBBk..',
  '...kbbbbbbbbk...',
  '......kssk......',
  '.kkkkkkkkkkkkkk.',
  'kHHHHHHHHHHHHHHk',
  'kBBBBkppppkBBBBk',
  'kBBBBpggggpBBBBk',
  'kBBBBkppppkBBBBk',
  'kbBBBBBBBBBBBBbk',
  '.kbbbbbbbbbbbbk.',
  '...kssk..kssk...',
  '...kssk..kssk...',
  '..kkkkk..kkkkk..',
];
export const PIERNAS_B = [
  '...kssk..kssk...',
  '..kkkkk..kssk...',
  '.........kkkkk..',
];
export const PARPADEO = { 5: '..kBBBBBBBBBBk..', 6: '..kBkkBBBBkkBk..' };

export const ETIQUETA = [
  '..kkkkkkkkk.',
  '.kwwwwwwwwwk',
  'kwkwwwwwwwwk',
  'kwwwkkkkkwwk',
  'kwwwwwwwwwwk',
  '.kwwkkkkwwwk',
  '..kkkkkkkkk.',
];
export const BALDE = [
  '..kkkkkk..',
  '.kPPPPPPk.',
  'kkkkkkkkkk',
  'kSSSSSSSSk',
  'kSPPPPPPSk',
  'kSPPPPPPSk',
  '.kSSSSSSk.',
  '.kSSSSSSk.',
  '..kkkkkk..',
];
export const BATERIA = [
  'kkkkkkkkkk..',
  'kGGGGGGGGkk.',
  'kGGGGGGGGkkk',
  'kGGGGGGGGkkk',
  'kGGGGGGGGkk.',
  'kkkkkkkkkk..',
];
export const ESTACION = [
  '...kkkkkkkk...',
  '..kSSSSSSSSk..',
  '..kSkkkkkkSk..',
  '..kSkYYYYkSk..',
  '..kSkYkYYkSk..',
  '..kSkkYYkkSk..',
  '..kSkYYkYkSk..',
  '..kSkYYYYkSk..',
  '..kSkkkkkkSk..',
  '..kSSSSSSSSk..',
  '..kSSDDDDSSk..',
  '..kSSSSSSSSk..',
  '..kSSDDDDSSk..',
  '..kSSSSSSSSk..',
  '..kSSSSSSSSk..',
  '.kkkkkkkkkkkk.',
  'kSSSSSSSSSSSSk',
  'kkkkkkkkkkkkkk',
];
export const PUERTA = [
  'kkkkkkkkkkkkkkkk',
  'kSSSSSSSSSSSSSSk',
  'kSkkkkkkkkkkkkSk',
  'kSkGGGGGGGGGGkSk',
  'kSkGGGGGGGGGGkSk',
  'kSkkkkkkkkkkkkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDLDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kSkDDDDDDDDDDkSk',
  'kkkkkkkkkkkkkkkk',
];
export const LAMPARA = [
  '...kk...',
  '...kk...',
  '..kkkk..',
  '.kSSSSk.',
  'kSSSSSSk',
  'kYYYYYYk',
];

export function sprite(ctx, mapa, x, y, pal, { escala = 1, filas = null, contorno = null, punteado = false, alfa = 1, espejo = false } = {}) {
  ctx.save();
  ctx.globalAlpha = alfa;
  mapa.forEach((fila, j) => {
    const f = filas?.[j] ?? fila;
    for (let i = 0; i < f.length; i++) {
      const c = espejo ? f[f.length - 1 - i] : f[i];
      if (c === '.') continue;
      if (contorno) {
        if (c !== 'k') continue;
        if (punteado && (i + j) % 2) continue;
        ctx.fillStyle = contorno;
      } else {
        const col = pal[c];
        if (!col) continue;
        ctx.fillStyle = col;
      }
      ctx.fillRect(Math.round(x) + i * escala, Math.round(y) + j * escala, escala, escala);
    }
  });
  ctx.restore();
}

export function paletaRobot({ color, energia, apagado, parpadeo, antena }) {
  const base = apagado ? '#6b6880' : colorDe(color) || '#8494ab';
  const e = typeof energia === 'number' ? energia : 100;
  return {
    k: P.ink, s: P.steel, B: base, b: mezclar(base, -0.32), H: mezclar(base, 0.35),
    a: apagado ? P.off : antena ? P.on : mezclar(P.on, -0.45),
    e: apagado ? P.off : P.eye, o: apagado ? P.off : P.ink, m: P.ink, p: P.panel,
    g: apagado ? P.off : e > 40 ? P.green : e > 15 ? P.amber : P.red,
    _parpadeo: parpadeo,
  };
}

/* ---------- Sprites de los mundos 2 a 4 ---------- */
export const CANDADO = [
  '..kkk..',
  '.k...k.',
  '.k...k.',
  'kkkkkkk',
  'kYYYYYk',
  'kYYkYYk',
  'kYYkYYk',
  'kkkkkkk',
];
export const CANDADO_ABIERTO = [
  '..kkk..',
  '.k...k.',
  '.....k.',
  'kkkkkkk',
  'kRRRRRk',
  'kRRkRRk',
  'kRRkRRk',
  'kkkkkkk',
];
export const OPERARIO = [
  '...kkkk...',
  '..kYYYYk..',
  '.kYYYYYYk.',
  '..kssssk..',
  '..ksesek..',
  '..kssssk..',
  '...kssk...',
  '.kkBBBBkk.',
  'kBBBBBBBBk',
  'kBkBBBBkBk',
  'kBkBBBBkBk',
  'kskBBBBksk',
  '..kBBBBk..',
  '..kDDDDk..',
  '..kDkkDk..',
  '..kDkkDk..',
  '..kDkkDk..',
  '.kkkkkkkk.',
];
export const BANDERA = [
  'kk..............',
  'kSkkkkkkkkkkkkk.',
  'kSkFFFFFFFFFFFFk',
  'kSkFFFFFFFFFFFFk',
  'kSkFFFFFFFFFFFFk',
  'kSkFFFFFFFFFFFFk',
  'kSkFFFFFFFFFFFk.',
  'kSkkkkkkkkkkkk..',
  'kSk.............',
  'kSk.............',
  'kSk.............',
  'kkk.............',
];
export const EDIFICIO = [
  '..........kkkk..........',
  '..........kSSk..........',
  '..kkkkkkkkkSSkkkkkkkkk..',
  '.kWWWWWWWWWWWWWWWWWWWWk.',
  'kWWWWWWWWWWWWWWWWWWWWWWk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kSSSSSSSSSSSSSSSSSSSSSSk',
  'kSkYYkSSkYYkSSkYYkSSkYYk',
  'kSkYYkSSkYYkSSkYYkSSkYYk',
  'kSSSSSSSSSSSSSSSSSSSSSSk',
  'kSkYYkSSkYYkSSkYYkSSkYYk',
  'kSkYYkSSkYYkSSkYYkSSkYYk',
  'kSSSSSSSSSSDDDDSSSSSSSSk',
  'kSSSSSSSSSSDDDDSSSSSSSSk',
  'kSSSSSSSSSSDDDDSSSSSSSSk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
];
export const LLAVE = [
  '.kk...kk.',
  'kSSk.kSSk',
  'kSSSkSSSk',
  '.kSSSSSk.',
  '..kSSSk..',
  '...kSk...',
  '...kSk...',
  '...kSk...',
  '...kkk...',
];
export const LINTERNA = [
  '.kkkkkk.',
  'kLLLLLLk',
  'kLLLLLLk',
  '.kkkkkk.',
  '..kBBk..',
  '..kBBk..',
  '..kBBk..',
  '..kGGk..',
  '..kBBk..',
  '..kBBk..',
  '..kBBk..',
  '..kkkk..',
];
export const DRON = [
  'kkkkkk....kkkkkk',
  '...kk......kk...',
  '...kkkkkkkkkk...',
  '..kBBBBBBBBBBk..',
  '.kBBkeeBBeekBBk.',
  '..kBBBBBBBBBBk..',
  '...kkkkkkkkkk...',
  '....k......k....',
];
export const CAJA = [
  'kkkkkkkkkkkkkk',
  'kBBBBBBBBBBBBk',
  'kBkkkkkkkkkkBk',
  'kBkHHHHHHHHkBk',
  'kBkHHHHHHHHkBk',
  'kBkHHHHHHHHkBk',
  'kBkHHHHHHHHkBk',
  'kBkkkkkkkkkkBk',
  'kBBBBGGBBBBBBk',
  'kBBBBGGBBBBBBk',
  'kkkkkkkkkkkkkk',
];
export const ENCHUFE = [
  '.k.k.',
  '.k.k.',
  'kkkkk',
  'kYYYk',
  '.kYk.',
  '..k..',
];
