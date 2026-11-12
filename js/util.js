'use strict';
// Utilidades compartidas: matemáticas, hash, paletas (ConsoleColor -> piedra / luz / texto) y matrices 4x4.
window.G = window.G || {};
(function (G) {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.clamp = clamp;
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  G.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  G.hash = (x, y, z = 0) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16;
    return h >>> 0;
  };
  G.hf = (x, y, z = 0) => G.hash(x, y, z) / 4294967296;
  G.rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---- color (enteros 0xRRGGBB) ----
  G.shade = (h, f) => {
    const r = clamp(((h >> 16) & 255) * f, 0, 255) | 0, g = clamp(((h >> 8) & 255) * f, 0, 255) | 0, b = clamp((h & 255) * f, 0, 255) | 0;
    return (r << 16) | (g << 8) | b;
  };
  G.mixc = (a, b, t) => {
    const r = (((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t) | 0, g = (((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t) | 0, bl = ((a & 255) * (1 - t) + (b & 255) * t) | 0;
    return (r << 16) | (g << 8) | bl;
  };
  G.desat = (c, k) => { const l = (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) | 0; return G.mixc(c, (l << 16) | (l << 8) | l, k); };
  G.css = (h) => '#' + (h & 0xffffff).toString(16).padStart(6, '0');
  G.rgbf = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

  // Paletas indexadas por el valor de System.ConsoleColor (0..15).
  // Black DarkBlue DarkGreen DarkCyan DarkRed DarkMagenta DarkYellow Gray DarkGray Blue Green Cyan Red Magenta Yellow White
  G.STONE = [0x0b0a0c, 0x262d54, 0x35502f, 0x3c5a63, 0x6e2f2b, 0x57385f, 0x8c7140, 0x8d9094, 0x4d4f55, 0x4059b2, 0x508a43, 0x5f9fa8, 0xaa423b, 0x9b59a9, 0xc6a84b, 0xd8d4c8];
  G.GLOW = [0x101014, 0x4a5cff, 0x4cd05c, 0x35c8d8, 0xe0452f, 0xc050d8, 0xf0a63a, 0xc8c8c8, 0x808080, 0x6a8cff, 0x5cff6a, 0x5ae6ff, 0xff4a3a, 0xff6cf0, 0xffd34a, 0xffffff];
  // Texto de la interfaz (pergamino, oro, hielo...) para los colores de consola del juego.
  G.TXT = ['#0b0907', '#7f8fe8', '#6fbf63', '#86b3ad', '#d2544a', '#b779d0', '#e0a640', '#a69f92', '#756e63', '#8fa8ff', '#86e07a', '#d3c595', '#ff6a5c', '#e08cf0', '#f6cf55', '#fbf4df'];

  // ---- matrices 4x4 (columna mayor, como WebGL) ----
  const M = G.m4 = {};
  M.ident = (o = new Float32Array(16)) => { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; };
  M.persp = (fovy, asp, n, f, o = new Float32Array(16)) => {
    const t = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  };
  M.look = (e, c, u, o = new Float32Array(16)) => {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1; return o;
  };
  M.mul = (a, b, o = new Float32Array(16)) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3; o[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      o[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3; o[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
    }
    return o;
  };
  M.trans = (x, y, z, o = new Float32Array(16)) => { M.ident(o); o[12] = x; o[13] = y; o[14] = z; return o; };
  M.rotX = (a, o = new Float32Array(16)) => { M.ident(o); const c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; };
  M.rotY = (a, o = new Float32Array(16)) => { M.ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; };
  M.rotZ = (a, o = new Float32Array(16)) => { M.ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; };
  M.scale = (x, y, z, o = new Float32Array(16)) => { M.ident(o); o[0] = x; o[5] = y; o[10] = z; return o; };
  // proyecta un punto del mundo a píxeles CSS de pantalla usando la matriz VP
  M.project = (vp, x, y, z, w, h) => {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.01) return null;
    return [(cx / cw * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h, cw];
  };

  G.ENEMY = [
    { n: 'Rata de cripta', c: 0x8a6a4a }, { n: 'Murciélago de hollín', c: 0x8a4aa8 }, { n: 'Esqueleto ardido', c: 0xd8d2bc }, { n: 'Rey Ceniciento', c: 0xe0452f },
    { n: 'Ánima errante', c: 0x9fd8e8 }, { n: 'Arquero calcinado', c: 0x6fbf63 }, { n: 'Gólem de hollín', c: 0xb0603a }];
  G.CLASS_COL = [0xc4402f, 0x4a6fe0, 0x4fa84a, 0x8a62c4, 0xe6c35a];
  G.CLASS_NAME = ['Guerrero', 'Mago', 'Arquero', 'Pícaro', 'Clérigo'];
})(window.G);
