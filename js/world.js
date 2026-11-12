'use strict';
// Mundo voxel: convierte el mapa del juego en terreno de cubos (chunks con oclusión ambiental), hornea la luz de
// antorchas/lava, anima héroe, enemigos, PNJ y objetos, y dibuja partículas. Lo usan la partida y la escena del título.
(function (G) {
  const CS = 8, VPT = 4, VSZ = 0.25, WALL_H = 6;
  const DECAL = { '/': 7, 'x': 1, ',': 8, '"': 3, '*': 4, '+': 6, '~': 5, '.': 2, '^': 9 };
  const SOLIDCH = (c) => c === 35 || c === 116 || c === 115;          // # t s
  const tierOf = (id) => (id && +id[1]) || 1;
  const ZERO6 = [0, 0, 0, 0, 0, 0];

  // luz cálida/fría de las antorchas según el color de luz del bioma (valor de ConsoleColor)
  function lightCol(ci) {
    switch (ci) {
      case 14: return [1.0, 0.82, 0.38]; case 6: return [1.0, 0.62, 0.28];
      case 11: return [0.35, 0.78, 1.0]; case 3: return [0.30, 0.72, 0.88];
      case 12: case 4: return [1.0, 0.32, 0.22]; case 13: case 5: return [0.82, 0.38, 1.0];
      case 10: case 2: return [0.42, 1.0, 0.52]; case 9: case 1: return [0.42, 0.52, 1.0];
      default: return [1.0, 0.72, 0.4];
    }
  }
  const FLAME = { 14: 0xffd34a, 6: 0xff8a2a, 11: 0x5ae6ff, 3: 0x35c8d8, 12: 0xff4a3a, 4: 0xe0452f, 13: 0xff6cf0, 5: 0xc050d8, 10: 0x5cff6a, 2: 0x4cd05c, 9: 0x6a8cff, 1: 0x4a5cff };

  class Ent {
    constructor(kind, id) {
      this.kind = kind; this.id = id; this.x = 0; this.z = 0; this.tx = 0; this.ty = 0; this.yaw = 0; this.tyaw = 0;
      this.walk = Math.random() * 6; this.spd = 0; this.atk = -1; this.hurt = 0; this.windup = false; this.cast = 0; this.model = null;
      this.alpha = 1; this.scale = 1; this.flags = 0; this.hp = 1; this.maxhp = 1; this.seed = Math.random() * 10; this.vis = true; this.carg = -1; this.cargOk = false;
      this.type = 0; this.ch = ''; this.itemId = ''; this.moveT = 0; this.key = ''; this.col = 0; this.elite = false; this.guard = false; this.dir = [0, 1]; this.born = 0;
    }
  }

  class World {
    constructor(eng, opts = {}) {
      this.eng = eng; this.gl = eng.gl; this.opts = opts;
      this.particles = new G.Particles(6000);
      this.ents = new Map(); this.hero = null; this.torches = []; this.chunks = new Map();
      this.w = 0; this.h = 0; this.cells = null; this.cam = { x: 0, z: 0 }; this.shake = 0; this.flick = 1; this.t = 0;
      this.floats = []; this.s = null; this.fxSeen = new Set(); this.prevAtkCd = 0; this.prevCd = []; this.prevLv = 0; this.prevFlash = false; this.pisoActual = -1;
      this.dying = []; this.onSfx = null; this.visDirty = true; this.allVisible = !!opts.allVisible; this.amb = [0.04, 0.045, 0.07];
      this.statics = []; this.torchEmit = 0; this.dust = 0; this.shadowMesh = null; this.camDist = opts.dist || 17; this.camPitch = opts.pitch || 0.93; this.zoom = 1;
    }

    // ------------------------------------------------------------ mapa → columnas de voxels
    setMap(m) {
      const W = m.w, H = m.h;
      const cells = new Uint8Array(W * H), bio = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { cells[y * W + x] = m.rows[y].charCodeAt(x); bio[y * W + x] = m.bio[y].charCodeAt(x) - 48; }
      const same = this.cells && this.w === W && this.h === H && this.pisoActual === m.piso;
      const dirty = new Set();
      if (same) { for (let i = 0; i < W * H; i++) if (cells[i] !== this.cells[i]) { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dirty.add(((x + dx) >> 3) + ',' + ((y + dy) >> 3)); } }
      this.w = W; this.h = H; this.cells = cells; this.bio = bio; this.piso = m.piso; this.nombre = m.nombre; this.temas = m.temas; this.pisoActual = m.piso;
      if (!same) { this.disposeChunks(); this.visT = new Float32Array(W * H); this.visS = new Float32Array(W * H); this.expl = new Uint8Array(W * H); this.visBytes = new Uint8Array(W * H * 4); this.clearEnts(); }
      else for (const k of dirty) { const c = this.chunks.get(k); if (c) { c.mesh && c.mesh.free(); this.chunks.delete(k); } }
      this.buildColumns(); this.bakeLights(); this.buildBurst = 3;
      if (this.allVisible) { this.visT.fill(1); this.visS.fill(1); this.expl.fill(1); }
      this.visDirty = true;
    }
    reset() { this.disposeChunks(); this.ents.clear(); this.hero = null; this.cells = null; this.pisoActual = -1; this.prevLv = 0; this.heroPiso = -1; this.particles.n = 0; this.dying.length = 0; this.floats = []; this.s = null; this.fxSeen = new Set(); this.torches = []; this.cam.init = false; this.flash = null; this.flashes = []; }
    clearEnts() { for (const [id, e] of this.ents) if (e.kind !== 'hero') this.ents.delete(id); this.dying.length = 0; this.particles.n = 0; }
    disposeChunks() { for (const c of this.chunks.values()) c.mesh && c.mesh.free(); this.chunks.clear(); }
    th(tx, ty) { return this.temas[this.bio[ty * this.w + tx]] || this.temas[0]; }
    isWallCh(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true; const c = this.cells[y * this.w + x]; return SOLIDCH(c) || c === 112; }

    buildColumns() {
      const W = this.w, H = this.h, VW = W * VPT, VH = H * VPT;
      this.VW = VW; this.VH = VH;
      const top = this.top = new Int8Array(VW * VH), kind = this.kind = new Uint8Array(VW * VH), prop = this.prop = new Uint8Array(VW * VH);
      this.torches = [];
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        const c = this.cells[ty * W + tx];
        let deep = false;
        if (SOLIDCH(c)) { deep = true; for (let dy = -1; dy <= 1 && deep; dy++) for (let dx = -1; dx <= 1; dx++) if (!this.isWallCh(tx + dx, ty + dy) || (dx === 0 && dy === 0 ? false : (() => { const q = (tx + dx >= 0 && ty + dy >= 0 && tx + dx < W && ty + dy < H) ? this.cells[(ty + dy) * W + tx + dx] : 35; return q === 112; })())) { deep = false; break; } }
        for (let sz = 0; sz < VPT; sz++) for (let sx = 0; sx < VPT; sx++) {
          const i = (ty * VPT + sz) * VW + tx * VPT + sx; let k = 1, h = 0;
          if (SOLIDCH(c)) { k = deep ? 0 : (c === 115 ? 7 : 2); h = WALL_H; }
          else if (c === 112) { k = 6; h = (sx === 1 || sx === 2) && (sz === 1 || sz === 2) ? 7 : 2; }
          else if (c === 62) { k = 5; h = -4 + sz; }
          else if (c === 119) { k = 3; h = -1; } else if (c === 108) { k = 4; h = -1; }
          top[i] = h; kind[i] = k;
        }
        if (c === 116) {                                                                  // antorcha en el muro: busca la cara abierta
          for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nx = tx + dx, ny = ty + dz; if (!this.isWallCh(nx, ny)) { this.torches.push({ x: tx + 0.5 + dx * 0.5, z: ty + 0.5 + dz * 0.5, tx: nx, ty: ny, yaw: Math.atan2(dx, dz), th: this.th(tx, ty) }); break; } }
        }
      }
      // decoración: relieve y manchas de color según el bioma (determinista por casilla)
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        if (this.cells[ty * W + tx] !== 46) continue;
        const hh = G.hash(tx, ty, this.piso * 131 + 9), th = this.th(tx, ty);
        let type = 0;
        if (hh % 9 === 0) type = DECAL[th.d] || 0; else if (hh % 31 === 0) type = 2; else if (hh % 67 === 0) type = 1;
        if (!type) continue;
        const corners = [[0, 0], [VPT - 1, 0], [0, VPT - 1], [VPT - 1, VPT - 1]], r = G.hash(tx, ty, 77);
        const at = (sx, sz) => (ty * VPT + sz) * VW + tx * VPT + sx;
        if (type === 1 || type === 2 || type === 3 || type === 9 || type === 4) {
          const n = type === 4 ? 1 : 1 + (r % 2);
          for (let j = 0; j < n; j++) { const [sx, sz] = corners[(r >>> (j * 2)) % 4], i = at(sx, sz); top[i] += type === 4 ? 3 : type === 9 ? 2 + (r % 2) : 1; prop[i] = type; if (type === 4 && j === 0) { const [qx, qz] = [sx ^ 1, sz]; const q = at(qx, qz); top[q] += 1; prop[q] = 4; } }
        } else if (type === 7) { const d = r & 1; for (let k = 0; k < VPT; k++) prop[at(k, d ? k : VPT - 1 - k)] = 7; }
        else if (type === 6) { for (const [sx, sz] of [[1, 1], [2, 1], [1, 2], [2, 2]]) prop[at(sx, sz)] = 6; }
        else { const n = type === 5 ? 4 : 3; for (let j = 0; j < n; j++) prop[at((r >>> (j * 3)) % VPT, (r >>> (j * 3 + 1)) % VPT)] = type; }
      }
    }

    // ------------------------------------------------------------ luz horneada (antorchas, lava, escaleras)
    bakeLights() {
      const W = this.w, H = this.h, lit = this.lit = new Float32Array(W * H * 3), stamp = new Int32Array(W * H);
      let st = 0; const qx = new Int16Array(W * H), qy = new Int16Array(W * H);
      const pass = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !this.isWallCh(x, y);
      const add = (sx, sy, col, R, inten) => {
        st++; let a = 0, b = 0; qx[b] = sx; qy[b++] = sy; stamp[sy * W + sx] = st;
        while (a < b) {
          const x = qx[a], y = qy[a++], d = Math.hypot(x - sx, y - sy);
          if (d > R) continue;
          const f = Math.pow(1 - d / R, 2.0) * inten, i = (y * W + x) * 3;
          lit[i] += col[0] * f; lit[i + 1] += col[1] * f; lit[i + 2] += col[2] * f;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (pass(nx, ny) && stamp[ny * W + nx] !== st) { stamp[ny * W + nx] = st; qx[b] = nx; qy[b++] = ny; } }
        }
      };
      for (const t of this.torches) { t.col = lightCol(t.th.sl); t.flame = FLAME[t.th.sl] || 0xff8a2a; if (pass(t.tx, t.ty)) add(t.tx, t.ty, t.col, 7.5, 1.0); }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = this.cells[y * W + x];
        if (c === 108) add(x, y, [1.0, 0.45, 0.15], 3.4, 0.55); else if (c === 62) add(x, y, [1.0, 0.78, 0.32], 4.6, 0.9);
      }
      const copy = lit.slice();                                                           // los muros toman la luz de sus vecinos abiertos
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!this.isWallCh(x, y)) continue; let m = [0, 0, 0];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = (ny * W + nx) * 3; for (let k = 0; k < 3; k++) m[k] = Math.max(m[k], copy[j + k]); }
        const i = (y * W + x) * 3; for (let k = 0; k < 3; k++) lit[i + k] = m[k] * 0.85;
      }
      const px = new Uint8Array(W * H * 4);
      for (let i = 0; i < W * H; i++) { px[i * 4] = G.clamp(lit[i * 3] / 1.6 * 255, 0, 255); px[i * 4 + 1] = G.clamp(lit[i * 3 + 1] / 1.6 * 255, 0, 255); px[i * 4 + 2] = G.clamp(lit[i * 3 + 2] / 1.6 * 255, 0, 255); px[i * 4 + 3] = 255; }
      this.eng.uploadTex(this.eng.litTex, W, H, px);
    }

    // ------------------------------------------------------------ visibilidad
    setVis(v) {
      const W = this.w, H = this.h, dec = (b64) => { const s = atob(b64), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
      const a = dec(v.vis), b = dec(v.exp);
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { const i = y * W + x, k = x * H + y; this.visT[i] = a[k]; this.expl[i] = b[k]; }   // el juego envía bool[x, y]: índice = x * H + y
      this.visDirty = true;
    }
    isVisible(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.visT[y * this.w + x] > 0.5; }
    updateVis(dt) {
      if (!this.visT) return;
      const n = this.w * this.h, k = 1 - Math.exp(-dt * 11); let moving = false;
      if (this.allVisible) { if (this.visDirty) { for (let i = 0; i < n; i++) { this.visBytes[i * 4] = 255; this.visBytes[i * 4 + 1] = 255; } this.eng.uploadTex(this.eng.visTex, this.w, this.h, this.visBytes); this.visDirty = false; } return; }
      for (let i = 0; i < n; i++) {
        const d = this.visT[i] - this.visS[i];
        if (d > 0.003 || d < -0.003) { this.visS[i] += d * k; moving = true; } else this.visS[i] = this.visT[i];
        this.visBytes[i * 4] = this.visS[i] * 255; this.visBytes[i * 4 + 1] = this.expl[i] * 255;
      }
      if (moving || this.visDirty) { this.eng.uploadTex(this.eng.visTex, this.w, this.h, this.visBytes); this.visDirty = moving; }
    }

    // ------------------------------------------------------------ malla del terreno por chunks
    colorOf(vx, vz, L, f, k, i) {
      const tx = vx >> 2, ty = vz >> 2, sx = vx & 3, sz = vz & 3, th = this.th(tx, ty), r = G.hf(vx, L, vz), S = G.STONE, p = this.prop[i];
      switch (k) {
        case 1: {                                                                          // suelo
          const checker = (((tx >> 1) + (ty >> 1)) & 1) === 0, base = G.desat(checker ? S[th.su] : G.mixc(S[th.sa], S[th.su], 0.5), 0.42);
          let pc = -1;
          if (p === 1) pc = G.shade(0xd8d2bc, 0.9 + 0.2 * r); else if (p === 2) pc = G.shade(S[7], 0.7 + 0.4 * r); else if (p === 3) pc = G.shade(r > 0.5 ? 0x4f8a42 : 0x6aa850, 0.9 + 0.2 * r);
          else if (p === 4) pc = G.E(G.GLOW[th.ac && th.ac.length ? th.ac[(tx + ty) % th.ac.length] : 11]); else if (p === 9) pc = G.shade(S[8], 1.1 + 0.3 * r);
          else if (p === 5) pc = G.E(r > 0.5 ? 0xff7a2a : 0xd8501a); else if (p === 6) pc = G.E(G.GLOW[th.sl]);
          if (f === 2) {
            if (pc >= 0) return pc;
            const edge = (sx === 0 || sz === 0) ? 0.84 : 1.0, tile = 0.94 + 0.12 * G.hf(tx, ty, 5);
            let c = G.shade(base, (0.9 + 0.2 * r) * edge * tile);
            if (p === 7 || p === 8) c = G.shade(c, 0.5);
            return c;
          }
          if (pc >= 0 && (p <= 4 || p === 9)) return (pc >>> 24) ? pc : G.shade(pc, 0.72);
          return G.shade(base, 0.5 + 0.15 * r);
        }
        case 2: case 7: case 8: {                                                           // muros
          const base = G.desat(S[k === 7 ? th.s : th.m], 0.22);
          if (f === 2) return G.shade(S[k === 7 ? th.s : th.ma], 0.78 + 0.2 * r);
          const hz = (f === 0 || f === 1) ? vz : vx, mortar = ((hz + ((L & 1) << 1)) & 3) === 0, grad = 0.78 + 0.22 * G.clamp((L + 1) / WALL_H, 0, 1);
          if (k === 7 && r > 0.88) return G.E(G.GLOW[th.s]);
          return G.shade(base, (mortar ? 0.74 : 1.0) * grad * (0.88 + 0.24 * r));
        }
        case 3: return f === 2 ? (G.mixc(S[th.ab] || 0x1a2a50, G.GLOW[th.af] || 0x35c8d8, 0.3) | (1 << 24)) : G.shade(S[th.ab], 0.5);
        case 4: return f === 2 ? ((r > 0.8 ? 0xffd34a : r > 0.4 ? G.GLOW[th.lf] : 0xd8401a) | (2 << 24)) : G.shade(0x4a1810, 0.6 + 0.4 * r);
        case 5: {                                                                           // escalera descendente
          if (f === 2) { if (sz === 0) return G.E(0xffc040); if (sz === 1) return G.E(0xb07a20); return G.shade(S[th.ma], 0.8 + 0.3 * r); }
          return G.shade(S[th.m], 0.55 + 0.2 * r);
        }
        case 6: return f === 2 ? G.shade(S[th.ma], 0.85 + 0.2 * r) : G.shade(S[th.p] || S[th.m], 0.8 + 0.3 * r + 0.1 * ((L & 1)));
      }
      return 0xff00ff;
    }

    buildChunk(cx, cy) {
      const VW = this.VW, VH = this.VH, top = this.top, kind = this.kind, mb = new G.MeshBuilder(), ao = [0, 0, 0, 0], F = G.FACES;
      const solid = (x, y, z) => (x < 0 || z < 0 || x >= VW || z >= VH) ? true : y < top[z * VW + x];
      const x0 = cx * CS * VPT, z0 = cy * CS * VPT, x1 = Math.min(x0 + CS * VPT, VW), z1 = Math.min(z0 + CS * VPT, VH);
      const emit = (f, vx, y, vz, i, k) => {
        const FF = F[f];
        for (let c = 0; c < 4; c++) { const a = FF.ao[c]; const s1 = solid(vx + a[0][0], y + a[0][1], vz + a[0][2]), s2 = solid(vx + a[1][0], y + a[1][1], vz + a[1][2]), cc = solid(vx + a[2][0], y + a[2][1], vz + a[2][2]); ao[c] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc); }
        const col = this.colorOf(vx, vz, y, f, k, i), mat = col >>> 24;
        mb.quad(f, vx, y, vz, VSZ, 0, 0, 0, (col >> 16) & 255, (col >> 8) & 255, col & 255, mat, ao);
      };
      for (let vz = z0; vz < z1; vz++) for (let vx = x0; vx < x1; vx++) {
        const i = vz * VW + vx, k = kind[i]; if (k === 0) continue;
        const h = top[i];
        emit(2, vx, h - 1, vz, i, k);
        for (const f of [0, 1, 4, 5]) {
          const nx = vx + F[f].n[0], nz = vz + F[f].n[2];
          let nh = h; if (nx >= 0 && nz >= 0 && nx < VW && nz < VH) { const ni = nz * VW + nx; if (kind[ni] !== 0) nh = top[ni]; }
          for (let y = nh; y < h; y++) emit(f, vx, y, vz, i, k);
        }
      }
      return mb;
    }
    chunkHasExplored(cx, cy) {
      for (let y = cy * CS; y < Math.min(this.h, cy * CS + CS); y++) for (let x = cx * CS; x < Math.min(this.w, cx * CS + CS); x++) if (this.expl[y * this.w + x]) return true;
      return false;
    }
    streamChunks(tx, ty, budget = 2) {
      if (this.buildBurst > 0) { budget = 14; this.buildBurst--; }
      const R = 4; let built = 0; const ccx = (tx / CS) | 0, ccy = (ty / CS) | 0;
      for (let dy = -R; dy <= R && built < budget; dy++) for (let dx = -R - 1; dx <= R + 1 && built < budget; dx++) {
        const cx = ccx + dx, cy = ccy + dy; if (cx < 0 || cy < 0 || cx * CS >= this.w || cy * CS >= this.h) continue;
        const key = cx + ',' + cy; if (this.chunks.has(key)) continue;
        if (!this.chunkHasExplored(cx, cy)) continue;
        const mb = this.buildChunk(cx, cy); this.chunks.set(key, { mesh: G.gpuMesh(this.gl, mb), cx, cy }); built++;
      }
    }

    // ------------------------------------------------------------ estado del juego → entidades
    mkEnt(kind, id, modelKey, x, y) {
      const e = new Ent(kind, id); e.tx = x; e.ty = y; e.x = x + 0.5; e.z = y + 0.5; e.model = G.getModel(this.gl, modelKey); e.key = modelKey; e.born = this.t; this.ents.set(id, e); return e;
    }
    applyState(s) {
      const t = this.t, p = s.p; this.s = s;
      const wT = tierOf(p.eq[0]), aT = tierOf(p.eq[1]), key = `hero:${p.cls}:${wT}:${aT}`;
      if (this.hero && Math.hypot(p.x - this.hero.tx, p.y - this.hero.ty) > 6) this.buildBurst = 3;
      if (s.piso !== this.heroPiso) { this.heroPiso = s.piso; if (this.hero) { this.hero.x = p.x + 0.5; this.hero.z = p.y + 0.5; } }
      let h = this.hero;
      if (!h) { h = this.hero = new Ent('hero', 'p'); h.x = p.x + 0.5; h.z = p.y + 0.5; h.tyaw = h.yaw = Math.atan2(p.fx, p.fy); this.ents.set('p', h); }
      if (h.key !== key) { h.key = key; h.model = G.getModel(this.gl, key); }
      h.tx = p.x; h.ty = p.y; h.tyaw = Math.atan2(p.fx, p.fy); h.carg = p.carg; h.cargOk = p.cargOk; h.flags = p.inv ? 1 : 0; h.cls = p.cls;
      if (p.atkCd > 120 && this.prevAtkCd < 60) h.atk = 0; this.prevAtkCd = p.atkCd;
      if (p.flash && !this.prevFlash) { h.hurt = 1; this.shake = Math.max(this.shake, 0.28); this.onHurt && this.onHurt(); this.burst(h.x, 0.8, h.z, 0xff3a2a, 10, 2.2); }
      this.prevFlash = p.flash;
      if (p.lv > this.prevLv && this.prevLv > 0) this.levelUpFx(h);
      this.prevLv = p.lv;
      (s.q || []).forEach((q, i) => { const cd = q ? q[5] : 0; if (q && cd > 0 && (this.prevCd[i] || 0) <= 0) this.castFx(h, q); this.prevCd[i] = cd; });
      for (const n of s.sfx || []) { this.sfxFx(n); this.onSfx && this.onSfx(n); }

      const seen = new Set(['p']);
      for (const a of s.e) {
        const id = 'e' + a[0], fl = a[6]; seen.add(id); let e = this.ents.get(id);
        if (!e) {
          e = this.mkEnt('enemy', id, `enemy:${a[1]}:${fl & 3 ? 1 : 0}`, a[2], a[3]); e.type = a[1]; e.elite = !!(fl & 1); e.guard = !!(fl & 2);
          e.scale = e.model.scale * (fl & 2 ? 1.25 : fl & 1 ? 1.15 : 1); e.alpha = e.model.alpha;
        } else if (e.tx !== a[2] || e.ty !== a[3]) { e.moveT = 0.3; const dx = a[2] - e.tx, dy = a[3] - e.ty; if (dx || dy) e.tyaw = Math.atan2(dx, dy); e.tx = a[2]; e.ty = a[3]; }
        if ((fl & 4) && !(e.flags & 4)) { e.hurt = 1; this.hitFx(e); }
        const wind = !!(fl & 8);
        if (wind) { const dx = a[7] || (p.x - e.tx), dy = a[8] || (p.y - e.ty); if (dx || dy) e.tyaw = Math.atan2(Math.sign(dx) * (Math.abs(dx) >= Math.abs(dy) ? 1 : 0), Math.sign(dy) * (Math.abs(dy) > Math.abs(dx) ? 1 : 0)); }
        if (e.windup && !wind) e.atk = 0.28; e.windup = wind;
        e.hp = a[4]; e.maxhp = a[5]; e.flags = fl; e.vis = !!(fl & 256); e.fase = a[9];
      }
      for (const [id, e] of this.ents) if (e.kind === 'enemy' && !seen.has(id)) { if (e.vis) this.deathFx(e); this.ents.delete(id); }

      const seenO = new Set();
      for (const a of s.o) {
        const id = 'o' + a[0], ch = a[1]; seenO.add(id); let o = this.ents.get(id);
        if (!o) { const npc = ch === 'S' || ch === 'F' || ch === 'E'; o = this.mkEnt(npc ? 'npc' : 'item', id, npc ? `npc:${ch}` : `item:${ch}:${a[4]}`, a[2], a[3]); o.ch = ch; o.itemId = a[4]; o.col = 0; }
        o.vis = !!a[5];
      }
      for (const [id, e] of this.ents) if ((e.kind === 'item' || e.kind === 'npc') && !seenO.has(id)) { if (e.kind === 'item' && Math.hypot(e.tx - p.x, e.ty - p.y) < 2.6) this.pickupFx(e); this.ents.delete(id); }

      const seenP = new Set();
      for (const a of s.pr) {
        const id = 'r' + a[0]; seenP.add(id); let r = this.ents.get(id);
        if (!r) { r = this.mkEnt('proj', id, `proj:${a[1]}`, a[2], a[3]); r.pk = a[1]; r.col = a[7]; r.own = a[6]; }
        r.tx = a[2]; r.ty = a[3]; r.tyaw = Math.atan2(a[4], a[5]); if (r.born === t) r.yaw = r.tyaw;
      }
      for (const [id, e] of this.ents) if (e.kind === 'proj' && !seenP.has(id)) { this.impactFx(e); this.ents.delete(id); }

      const nowFx = new Set();
      for (const a of s.ef) { const id = 'f' + a[0]; nowFx.add(id); if (!this.fxSeen.has(id)) this.effectFx(a); }
      this.fxSeen = nowFx;
      this.floats = s.fl;
    }

    // ------------------------------------------------------------ efectos de partículas
    burst(x, y, z, color, n, speed, size = 0.06, life = 0.6, grav = 7, add = 0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, u = Math.random() * 0.9 + 0.1, v = (Math.random() * 0.8 + 0.3) * speed;
        this.particles.spawn(x, y, z, Math.cos(a) * u * speed, v, Math.sin(a) * u * speed, life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), G.shade(color, 0.8 + Math.random() * 0.4), 1, grav, 0.5, add);
      }
    }
    hitFx(e) { const c = [0xc9b8a0, 0x8a4aa8, 0xd8d2bc, 0xe0452f, 0x9fd8e8, 0x6fbf63, 0xb0603a][e.type] || 0xffffff; this.burst(e.x, 0.7 * e.scale, e.z, 0xfff0a0, 5, 2.4, 0.05, 0.3, 4, 1); this.burst(e.x, 0.6 * e.scale, e.z, c, 6, 2.0, 0.07, 0.7, 8); this.shake = Math.max(this.shake, e.type === 3 ? 0.14 : 0.07); }
    deathFx(e) {
      const c = [0x7b6350, 0x4a3560, 0xd9d3bd, 0x2a2630, 0xbfe3ee, 0x8a8272, 0x4b3f3a][e.type] || 0xcccccc, hgt = e.model.h * e.scale;
      for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, sp = 1.2 + Math.random() * 2.4; this.particles.spawn(e.x + (Math.random() - 0.5) * 0.3, 0.2 + Math.random() * hgt, e.z + (Math.random() - 0.5) * 0.3, Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp, 0.9 + Math.random() * 0.6, 0.07 + Math.random() * 0.08, G.shade(c, 0.7 + Math.random() * 0.5), 1, 12, 0.8); }
      this.burst(e.x, 0.5, e.z, 0xffb050, 8, 2.8, 0.05, 0.5, 2, 1);
      this.dying.push({ e, t: 0 }); this.shake = Math.max(this.shake, e.type === 3 ? 0.5 : 0.1);
    }
    pickupFx(e) { for (let i = 0; i < 12; i++) this.particles.spawn(e.x + (Math.random() - 0.5) * 0.4, 0.2, e.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 0.6, 0.8, 0.05, 0xffe27a, 1, -1.5, 0.3, 1); }
    impactFx(r) { const c = r.pk === 'bola' ? 0xff8a2a : r.pk === 'rayo' ? 0xd060ff : r.pk === 'bolaRey' ? 0xff3a2a : 0xe8e0c8; this.burst(r.x, 0.6, r.z, c, 8, 2.2, 0.06, 0.4, 3, 1); }
    castFx(h, q) {
      h.cast = 1; const cat = q[3];
      if (cat === 0) { const id = q[0]; const c = id.startsWith('pot_vida') ? 0xff4a3a : id.startsWith('pot_mana') ? 0x4a7bff : id === 'bomba' ? 0x888888 : 0xffd34a; for (let i = 0; i < 12; i++) this.particles.spawn(h.x + (Math.random() - 0.5) * 0.5, 0.2, h.z + (Math.random() - 0.5) * 0.5, 0, 1.0 + Math.random() * 1.4, 0, 1.0, 0.06, c, 1, -1, 0.3, 1); }
      else if (cat === 4) { const c = G.CLASS_COL[h.cls || 0]; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; this.particles.spawn(h.x + Math.cos(a) * 0.5, 0.3, h.z + Math.sin(a) * 0.5, Math.cos(a) * 1.2, 1.4, Math.sin(a) * 1.2, 0.6, 0.06, c, 1, 2, 0.5, 1); } }
    }
    levelUpFx(h) {
      for (let k = 0; k < 3; k++) for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; this.particles.spawn(h.x + Math.cos(a) * 0.55, 0.05 + k * 0.1, h.z + Math.sin(a) * 0.55, 0, 2.2 + k * 0.5, 0, 1.2, 0.07, k ? 0xffe27a : 0xffffff, 1, -0.5, 0.2, 1); }
      this.flash = { x: h.x, z: h.z, t: 0, c: [1, 0.85, 0.4] };
    }
    sfxFx(n) {
      if (n === 'boom') this.shake = Math.max(this.shake, 0.4); else if (n === 'tajo') this.shake = Math.max(this.shake, 0.3); else if (n === 'secreto') this.shake = Math.max(this.shake, 0.35);
    }
    effectFx(a) {
      const [, kind, x, y, color] = a, wx = x + 0.5, wz = y + 0.5, c = G.GLOW[color] || 0xffffff;
      if (kind === 'slash') { for (let i = 0; i < 9; i++) { const k = i / 8 - 0.5; this.particles.spawn(wx + k * 0.9, 0.5 + Math.abs(k) * -0.3 + 0.3, wz + Math.abs(k) * 0.3, k * 2, 0.8, 0.4, 0.22, 0.09, i % 2 ? 0xfff0a0 : 0xffffff, 1, 0, 3, 3); } this.burst(wx, 0.6, wz, 0xffe9a0, 4, 1.8, 0.04, 0.25, 2, 1); }
      else { this.burst(wx, 0.35, wz, c, 7, 2.6, 0.08, 0.55, 5, 1); this.burst(wx, 0.25, wz, G.shade(c, 0.6), 4, 1.6, 0.1, 0.8, 7); this.flashes = this.flashes || []; this.flashes.push({ x: wx, z: wz, t: 0, c: G.rgbf(c) }); if (this.flashes.length > 6) this.flashes.shift(); this.shake = Math.max(this.shake, 0.12); }
    }

    // ------------------------------------------------------------ actualización por fotograma
    update(dt, t) {
      this.t = t; this.eng.time = t;
      this.flick = 0.93 + 0.05 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
      for (const e of this.ents.values()) {
        const k = e.kind === 'proj' ? 26 : e.kind === 'hero' ? 16 : 11, tx = e.tx + 0.5, tz = e.ty + 0.5, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
        if (d > 3.5) { e.x = tx; e.z = tz; } else { const f = 1 - Math.exp(-k * dt); e.x += dx * f; e.z += dz * f; }
        e.spd += ((d > 0.06 ? 1 : 0) - e.spd) * (1 - Math.exp(-12 * dt)); e.walk += dt * (7 + 9 * e.spd) * (e.spd > 0.05 ? 1 : 0);
        e.yaw += G.angDiff(e.yaw, e.tyaw) * (1 - Math.exp(-(e.kind === 'proj' ? 40 : 14) * dt));
        if (e.atk >= 0) { e.atk += dt / 0.34; if (e.atk >= 1) e.atk = -1; }
        e.hurt = Math.max(0, e.hurt - dt * 5); e.cast = Math.max(0, e.cast - dt * 2.2);
        this.ambientFx(e, dt, t);
      }
      for (let i = this.dying.length - 1; i >= 0; i--) { this.dying[i].t += dt; if (this.dying[i].t > 0.45) this.dying.splice(i, 1); }
      if (this.flash) { this.flash.t += dt; if (this.flash.t > 0.8) this.flash = null; }
      if (this.flashes) { for (const f of this.flashes) f.t += dt; this.flashes = this.flashes.filter((f) => f.t < 0.35); }
      this.shake = Math.max(0, this.shake - dt * 1.4);
      // antorchas: brasas y llamas (solo las cercanas a la cámara)
      this.torchEmit += dt;
      if (this.torchEmit > 0.07) {
        this.torchEmit = 0;
        for (const tr of this.torches) {
          if (Math.abs(tr.x - this.cam.x) > 15 || Math.abs(tr.z - this.cam.z) > 12 || !this.isVisible(tr.tx, tr.ty)) continue;
          const fx = tr.x + Math.sin(tr.yaw) * 0.32, fz = tr.z + Math.cos(tr.yaw) * 0.32, c = tr.flame || 0xff8a2a;
          if (Math.random() < 0.55) this.particles.spawn(fx + (Math.random() - 0.5) * 0.08, 0.95, fz + (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.15, 0.7 + Math.random() * 0.6, (Math.random() - 0.5) * 0.15, 0.7, 0.045, c, 0.9, -0.2, 0.3, 3);
          if (Math.random() < 0.18) this.particles.spawn(fx, 1.0, fz, (Math.random() - 0.5) * 0.5, 1.2 + Math.random(), (Math.random() - 0.5) * 0.5, 1.4, 0.025, 0xffd9a0, 1, -0.3, 0.2, 1);
        }
      }
      this.dust += dt;
      if (this.dust > 0.12) {                                                                // polvo flotante en el aire
        this.dust = 0; const hx = this.cam.x, hz = this.cam.z;
        this.particles.spawn(hx + (Math.random() - 0.5) * 16, 0.3 + Math.random() * 1.8, hz + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 0.1, 0.03, (Math.random() - 0.5) * 0.1, 3.5, 0.022, 0xbfc8d8, 0.35, 0, 0.1, 1);
      }
      this.particles.update(dt);
      this.updateVis(dt);
      if (this.cells) this.streamChunks(this.cam.x | 0, this.cam.z | 0, 2);
    }

    ambientFx(e, dt, t) {
      const P = this.particles;
      if (e.kind === 'enemy' && e.vis) {
        if ((e.elite || e.guard) && Math.random() < dt * 14) P.spawn(e.x + (Math.random() - 0.5) * 0.5, 0.1, e.z + (Math.random() - 0.5) * 0.5, 0, 0.9, 0, 0.9, 0.04, e.guard ? 0x6adcff : 0xffd34a, 0.9, -0.2, 0.3, 1);
        if (e.type === 3 && Math.random() < dt * 40) P.spawn(e.x + (Math.random() - 0.5) * 0.7, 1.8, e.z + (Math.random() - 0.5) * 0.7, 0, 0.8, 0, 0.8, 0.06, Math.random() < 0.5 ? 0xff6a1a : 0xffd34a, 0.9, -0.3, 0.2, 1);
        if (e.type === 6 && e.spd > 0.5 && Math.random() < dt * 8) P.spawn(e.x, 0.05, e.z, (Math.random() - 0.5), 0.5, (Math.random() - 0.5), 0.6, 0.07, 0x6a5a50, 0.8, 3, 1, 0);
        if (e.type === 4 && Math.random() < dt * 10) P.spawn(e.x + (Math.random() - 0.5) * 0.3, 0.5, e.z + (Math.random() - 0.5) * 0.3, 0, 0.35, 0, 1.0, 0.04, 0xbfe9ff, 0.7, -0.1, 0.2, 1);
        if ((e.flags & 64) && Math.random() < dt * 6) P.spawn(e.x, 0.4, e.z, 0, 0.8, 0, 0.7, 0.04, 0x5cff6a, 0.9, -0.2, 0.3, 1);
        if (e.flags & 16 && Math.random() < dt * 8) P.spawn(e.x, 0.9, e.z, 0, 0.5, 0, 0.7, 0.04, 0xc050d8, 0.9, -0.2, 0.3, 1);
      } else if (e.kind === 'npc' && e.vis) {
        if (e.ch === 'F' && Math.random() < dt * 9) P.spawn(e.x + 0.3, 0.5, e.z + 0.5, (Math.random() - 0.2), 1.5 + Math.random(), (Math.random() - 0.5), 0.6, 0.03, 0xffb050, 1, 5, 0.2, 1);
        if (e.ch === 'F' && Math.random() < dt * 6) P.spawn(e.x + 0.75, 1.2, e.z - 0.3, 0, 0.8, 0, 1.0, 0.06, 0xff7a2a, 0.9, -0.2, 0.3, 1);
        if (e.ch === 'S' && Math.random() < dt * 5) P.spawn(e.x, 1.5, e.z, (Math.random() - 0.5) * 0.2, 0.5, 0, 0.9, 0.035, 0xffd34a, 0.9, -0.2, 0.2, 1);
        if (e.ch === 'E' && Math.random() < dt * 12) { const a = t * 2 + Math.random() * 6; P.spawn(e.x + Math.cos(a) * 0.5, 0.8, e.z + Math.sin(a) * 0.5, 0, 0.6, 0, 1.0, 0.04, 0xe060ff, 0.9, -0.2, 0.3, 1); }
      } else if (e.kind === 'item' && e.vis) {
        if ((e.ch === 'G' || e.ch === 'C' || e.ch === 'T') && Math.random() < dt * 5) P.spawn(e.x + (Math.random() - 0.5) * 0.4, 0.15, e.z + (Math.random() - 0.5) * 0.4, 0, 0.9, 0, 1.1, 0.035, e.ch === 'G' ? [0xc8c8c8, 0x7a9cff, 0xffe060, 0xff9a2a][tierOf(e.itemId) - 1] : 0xffe27a, 1, -0.2, 0.2, 1);
        if (e.ch === 'B' && Math.random() < dt * 8) P.spawn(e.x, 0.75, e.z, (Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4, 0.4, 0.03, 0xffd34a, 1, 0, 0.3, 1);
      } else if (e.kind === 'proj') {
        const c = e.pk === 'bola' ? 0xff8a2a : e.pk === 'rayo' ? 0xd060ff : e.pk === 'bolaRey' ? 0xff3a2a : e.pk === 'flecha' ? 0x5cff6a : 0xdddddd;
        if (e.pk !== 'flechaJ' && Math.random() < dt * 60) P.spawn(e.x, 0.55, e.z, (Math.random() - 0.5) * 0.4, (Math.random() - 0.2) * 0.4, (Math.random() - 0.5) * 0.4, 0.35, 0.06, c, 0.9, 0, 1, 3);
      } else if (e.kind === 'hero') {
        const b = this.s && this.s.p.buf || {};
        if (b.fur && Math.random() < dt * 20) P.spawn(e.x + (Math.random() - 0.5) * 0.5, 0.3, e.z + (Math.random() - 0.5) * 0.5, 0, 1.2, 0, 0.6, 0.05, 0xff4a2a, 0.9, -0.5, 0.3, 1);
        if (b.ven && Math.random() < dt * 8) P.spawn(e.x + (Math.random() - 0.5) * 0.4, 0.5, e.z + (Math.random() - 0.5) * 0.4, 0, 0.5, 0, 0.8, 0.04, 0x5cff6a, 0.9, -0.2, 0.2, 1);
        if ((b.esc || b.bar) && Math.random() < dt * 14) { const a = Math.random() * 6.283; P.spawn(e.x + Math.cos(a) * 0.55, 0.3 + Math.random() * 0.8, e.z + Math.sin(a) * 0.55, 0, 0.1, 0, 0.5, 0.04, b.bar ? 0x5ae6ff : 0xffd34a, 0.9, 0, 0.2, 1); }
        if (b.pri && Math.random() < dt * 20) P.spawn(e.x, 0.1, e.z, 0, 0.3, 0, 0.4, 0.05, 0xffffff, 0.5, 0, 0.3, 1);
        if (b.hum && Math.random() < dt * 14) P.spawn(e.x + (Math.random() - 0.5) * 0.6, 0.4, e.z + (Math.random() - 0.5) * 0.6, 0, 0.4, 0, 1.0, 0.1, 0x8a8a96, 0.4, 0, 0.1, 0);
        if (e.carg > 0.02 && Math.random() < dt * (10 + 40 * e.carg)) { const a = Math.random() * 6.283, r = 0.7 - 0.3 * e.carg; P.spawn(e.x + Math.cos(a) * r, 0.1 + Math.random() * 0.8, e.z + Math.sin(a) * r, -Math.cos(a) * 1.3, 0.4, -Math.sin(a) * 1.3, 0.4, 0.04, e.cargOk ? 0xfff0a0 : 0xffb050, 1, 0, 0.5, 1); }
        if (e.cargOk && Math.random() < dt * 25) P.spawn(e.x + (Math.random() - 0.5) * 0.4, 1.3, e.z + (Math.random() - 0.5) * 0.4, 0, 1.0, 0, 0.5, 0.05, 0xffffff, 1, 0, 0.2, 1);
      }
    }

    // ------------------------------------------------------------ poses (animación procedural de las piezas)
    rigOf(e) {
      const k = e.key;
      if (k.startsWith('hero') || k === 'enemy:2:0' || k === 'enemy:2:1' || k.startsWith('enemy:3') || k.startsWith('enemy:5')) return 'human';
      if (k.startsWith('npc:S')) return 'merchant'; if (k.startsWith('npc:F')) return 'smith'; if (k.startsWith('npc:E')) return 'altar';
      if (k.startsWith('enemy:0')) return 'rat'; if (k.startsWith('enemy:1')) return 'bat'; if (k.startsWith('enemy:4')) return 'ghost'; if (k.startsWith('enemy:6')) return 'golem';
      if (k === 'brazier') return 'brazier'; if (k === 'torch') return 'torch';
      return 'static';
    }
    pose(e, t) {
      const P = {}, rig = this.rigOf(e), sp = e.spd, sw = Math.sin(e.walk) * sp, idle = Math.sin(t * 2.1 + e.seed), bob = Math.abs(Math.sin(e.walk)) * 0.035 * sp;
      const swing = (a) => { if (a < 0) return 0; const w = G.smooth(0, 0.28, a), s = G.smooth(0.28, 0.5, a), r = G.smooth(0.72, 1, a); return (2.3 * w - 3.9 * s) * (1 - r); };
      let y = 0, lunge = e.atk >= 0 ? Math.sin(Math.min(1, e.atk * 1.4) * Math.PI) * 0.16 : 0;
      const wind = e.windup ? 1 : 0;
      switch (rig) {
        case 'human': {
          const crouch = e.carg > 0 ? e.carg * 0.05 : 0;
          let rA = -sw * 0.6 + idle * 0.04, lA = sw * 0.6 - idle * 0.04;
          if (e.atk >= 0) rA = swing(e.atk); if (wind) { rA = 2.2 + Math.sin(t * 38) * 0.06; if (e.key.startsWith('enemy:5')) { rA = -1.5; lA = -1.5; } }
          if (e.cast > 0) { rA = G.lerp(rA, -1.7, e.cast); lA = G.lerp(lA, -1.5, e.cast); }
          if (e.carg > 0) rA = 1.4 * e.carg + Math.sin(t * 40) * 0.05 * e.carg;
          P.legR = [sw * 0.75, 0, 0, 0, 0, 0]; P.legL = [-sw * 0.75, 0, 0, 0, 0, 0];
          P.torso = [-e.hurt * 0.35 + (e.atk >= 0 ? 0.18 : 0) + crouch * 2, 0, 0, 0, bob + idle * 0.006 - crouch, 0];
          P.head = [idle * 0.03 + e.hurt * 0.25, 0, 0, 0, 0, 0]; P.armR = [rA, 0, 0, 0, 0, 0]; P.armL = [lA, 0, 0, 0, 0, 0]; P.cape = [0.12 + sp * 0.35 + Math.sin(t * 3) * 0.05, 0, Math.sin(t * 2) * 0.05, 0, 0, 0];
          break;
        }
        case 'merchant': P.torso = [0, 0, 0, 0, idle * 0.008, 0]; P.head = [idle * 0.05, Math.sin(t * 0.7) * 0.25, 0, 0, 0, 0]; P.armR = [-0.2 + idle * 0.05, 0, 0, 0, 0, 0]; P.armL = [-0.2 - idle * 0.05, 0, 0, 0, 0, 0]; P.pack = [0, 0, Math.sin(t * 1.3) * 0.02, 0, 0, 0]; break;
        case 'smith': { const hh = (Math.sin(t * 4.2) + 1) / 2; P.armR = [1.9 - 3.4 * hh * hh * hh, 0, 0, 0, 0, 0]; P.torso = [0.12 * hh, 0, 0, 0, 0, 0]; P.head = [0.15 * hh, 0, 0, 0, 0, 0]; if (hh > 0.96 && !e.hit) { e.hit = true; for (let i = 0; i < 6; i++) this.particles.spawn(e.x, 0.45, e.z + 0.6, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.2) * 2, 0.5, 0.03, 0xffc060, 1, 8, 0.1, 1); } else if (hh < 0.7) e.hit = false; break; }
        case 'altar': P.orb = [0, 0, 0, 0, Math.sin(t * 2) * 0.07, 0]; P.ring = [0, t * 1.5, Math.sin(t * 1.2) * 0.2, 0, 0, 0]; break;
        case 'rat': P.body = [0, 0, 0, 0, Math.abs(Math.sin(e.walk)) * 0.03 * sp, 0]; P.legF = [sw * 0.9, 0, 0, 0, 0, 0]; P.legB = [-sw * 0.9, 0, 0, 0, 0, 0]; P.tail = [0, Math.sin(t * 6 + e.seed) * 0.5, 0, 0, 0, 0]; P.head = [Math.sin(e.walk * 2) * 0.1 * sp - wind * 0.4 + e.hurt * 0.3, 0, 0, 0, 0, 0]; break;
        case 'bat': { const f = Math.sin(t * 17 + e.seed) * 0.95; y = (e.model.fly || 0) + Math.sin(t * 3 + e.seed) * 0.07; P.wingR = [0, 0, -f, 0, 0, 0]; P.wingL = [0, 0, f, 0, 0, 0]; P.body = [sp * 0.25 + e.hurt * 0.4, 0, 0, 0, 0, 0]; break; }
        case 'ghost': y = (e.model.fly || 0) + Math.sin(t * 2 + e.seed) * 0.06; P.body = [0, 0, Math.sin(t * 1.3 + e.seed) * 0.07, 0, 0, 0]; P.armR = [wind ? -1.2 : Math.sin(t * 2.2) * 0.25 - 0.3, 0, Math.sin(t * 1.7) * 0.2, 0, 0, 0]; P.armL = [wind ? -1.2 : Math.sin(t * 2.0 + 1) * 0.25 - 0.3, 0, -Math.sin(t * 1.7) * 0.2, 0, 0, 0]; P.tail = [0, 0, Math.sin(t * 3) * 0.3, 0, 0, 0]; break;
        case 'golem': { let a = -sw * 0.4; if (e.atk >= 0) a = swing(e.atk) * 1.1; if (wind) a = 2.5; P.legR = [sw * 0.45, 0, 0, 0, 0, 0]; P.legL = [-sw * 0.45, 0, 0, 0, 0, 0]; P.torso = [e.atk >= 0 ? 0.2 : 0, 0, sw * 0.05, 0, Math.abs(Math.sin(e.walk)) * 0.03 * sp, 0]; P.armR = [a, 0, 0, 0, 0, 0]; P.armL = [e.atk >= 0 || wind ? a : sw * 0.4, 0, 0, 0, 0, 0]; P.head = [0.05, 0, 0, 0, 0, 0]; break; }
        case 'brazier': P.flame = [0, Math.sin(t * 2.3 + e.seed) * 0.15, 0, 0, Math.sin(t * 9 + e.seed) * 0.012, 0]; break;
        case 'torch': P.flame = [0, 0, 0, 0, 0, 0]; break;
        default: if (e.kind === 'item') y = 0.1 + Math.sin(t * 2 + e.seed) * 0.04;
      }
      return { P, y, lunge, rig };
    }

    // ------------------------------------------------------------ dibujo
    drawModel(e, t, o = {}) {
      const gl = this.gl, u = this.eng.main.u, m = e.model; if (!m) return;
      const { P, y, lunge, rig } = this.pose(e, t);
      let spin = 0, ey = y;
      if (e.kind === 'item') { spin = t * 1.1 + e.seed; if (e.ch === 'G' || e.ch === 'T') ey += 0.15; }
      const yaw = e.kind === 'item' ? spin : e.yaw, sc = e.scale * (e.kind === 'enemy' && e.born + 0.25 > t ? 0.6 + 1.6 * (t - e.born) : 1);
      const bx = e.x + Math.sin(yaw) * lunge, bz = e.z + Math.cos(yaw) * lunge;
      const m4 = G.m4, s = this.scr || (this.scr = Array.from({ length: 12 }, () => new Float32Array(16))), pool = this.mpool || (this.mpool = Array.from({ length: 32 }, () => new Float32Array(16)));
      m4.trans(bx, (o.y || 0) + ey, bz, s[0]); m4.rotY(yaw, s[1]); m4.mul(s[0], s[1], s[2]); m4.scale(sc, sc, sc, s[3]); const base = m4.mul(s[2], s[3], s[4]);
      const mats = {}; let pk = 0;
      gl.uniform2f(u.uAnchor, Math.floor(e.x) + 0.5, Math.floor(e.z) + 0.5);
      const tint = e.hurt > 0 ? [1, 0.25, 0.2, e.hurt * 0.55] : (e.flags & 16 && e.kind === 'enemy') ? [0.7, 0.2, 0.8, 0.22] : [0, 0, 0, 0];
      if (e.kind === 'hero' && e.carg > 0) { const c = e.cargOk ? 0.5 + 0.4 * Math.sin(t * 30) : 0.1 + 0.3 * e.carg; tint[0] = 1; tint[1] = 0.8; tint[2] = 0.3; tint[3] = c * 0.5; }
      if (e.kind === 'hero' && (this.s && this.s.p.buf && this.s.p.buf.fur)) { tint[0] = 1; tint[1] = 0.2; tint[2] = 0.1; tint[3] = Math.max(tint[3], 0.18 + 0.08 * Math.sin(t * 8)); }
      if (o.silhouette) { tint[0] = 0.35; tint[1] = 0.78; tint[2] = 1.0; tint[3] = 0.72; }
      gl.uniform4f(u.uTint, tint[0], tint[1], tint[2], tint[3]);
      let al = e.alpha * (m.alpha || 1); if (e.kind === 'hero' && (e.flags & 1) && e.hurt <= 0) { tint[0] = 1; tint[1] = 1; tint[2] = 1; tint[3] = Math.max(tint[3], 0.16 + 0.14 * Math.sin(t * 28)); gl.uniform4f(u.uTint, tint[0], tint[1], tint[2], tint[3]); }
      gl.uniform1f(u.uAlpha, o.silhouette ? 0.62 : (o.alpha ?? al));
      for (const part of m.parts) {
        if (!part.mesh) continue;
        const pr = P[part.name] || ZERO6, pv = part.pivot, parent = part.parent ? mats[part.parent] : base;
        m4.rotX(pr[0], s[5]); m4.rotZ(pr[2], s[6]); m4.mul(s[5], s[6], s[7]); m4.rotY(pr[1], s[8]); m4.mul(s[8], s[7], s[9]);
        m4.trans(pv[0] + pr[3], pv[1] + pr[4], pv[2] + pr[5], s[5]); m4.mul(s[5], s[9], s[6]);
        m4.trans(-pv[0], -pv[1], -pv[2], s[7]); m4.mul(s[6], s[7], s[8]);
        const M = pool[pk++ % 32]; m4.mul(parent || base, s[8], M); mats[part.name] = M;
        gl.uniformMatrix4fv(u.uModel, false, M);
        gl.bindVertexArray(part.mesh.vao); gl.drawElements(gl.TRIANGLES, part.mesh.n, gl.UNSIGNED_INT, 0);
      }
      if (o.noShadow || m.fly === undefined) return;
    }
    drawShadow(e, t) {
      if (!this.shadowMesh) this.shadowMesh = G.getModel(this.gl, 'disc');
      const gl = this.gl, u = this.eng.main.u, r = (e.model.r || 0.35) * e.scale * 1.15, part = this.shadowMesh.parts[0];
      const fl = e.model.fly ? 0.55 : 1;
      gl.uniform1i(u.uMode, 2); gl.uniform1f(u.uAlpha, 0.42 * fl); gl.uniform4f(u.uTint, 0, 0, 0, 0);
      gl.uniformMatrix4fv(u.uModel, false, G.m4.mul(G.m4.trans(e.x, 0.018, e.z), G.m4.scale(r / 0.4 * 1.0, 1, r / 0.4 * 1.0)));
      gl.uniform2f(u.uAnchor, Math.floor(e.x) + 0.5, Math.floor(e.z) + 0.5);
      gl.bindVertexArray(part.mesh.vao); gl.drawElements(gl.TRIANGLES, part.mesh.n, gl.UNSIGNED_INT, 0); gl.uniform1i(u.uMode, 1);
    }

    camTarget() { const h = this.hero; return h ? [h.x, h.z] : [this.cam.x, this.cam.z]; }
    collectLights(t) {
      const eng = this.eng; eng.resetLights(); const h = this.hero;
      if (h && !this.opts.noHeroLight) {
        const r = 6.0 + (h.carg > 0 ? 1.2 * h.carg : 0), f = this.flick, c = h.cls === 1 ? [0.85, 0.95, 1.25] : [1.15, 0.88, 0.62];
        eng.addLight(h.x, 1.15, h.z, r, c[0] * f * 1.2, c[1] * f * 1.2, c[2] * f * 1.2);
      }
      for (const l of this.statics) eng.addLight(l.x, l.y, l.z, l.r, l.c[0], l.c[1], l.c[2]);
      let nbz = 0; for (const e of this.ents.values()) if (e.key === 'brazier' && nbz < 4) { const f = this.flick; eng.addLight(e.x, 1.2, e.z, 6.5, 1.6 * f, 0.82 * f, 0.34 * f); nbz++; }
      if (this.flash) { const k = 1 - this.flash.t / 0.8; eng.addLight(this.flash.x, 1.2, this.flash.z, 7, 1.6 * k, 1.3 * k, 0.7 * k); }
      if (this.flashes) for (const f of this.flashes.slice(-2)) { const k = 1 - f.t / 0.35; eng.addLight(f.x, 0.8, f.z, 4.5, f.c[0] * 1.6 * k, f.c[1] * 1.6 * k, f.c[2] * 1.6 * k); }
      let n = 0;
      for (const e of this.ents.values()) {
        if (n >= 3) break;
        if (e.kind === 'proj') { const c = e.pk === 'bola' ? [1.4, 0.7, 0.25] : e.pk === 'rayo' ? [1.0, 0.4, 1.3] : e.pk === 'bolaRey' ? [1.4, 0.3, 0.2] : null; if (c) { eng.addLight(e.x, 0.6, e.z, 3.6, c[0], c[1], c[2]); n++; } }
        else if (e.kind === 'enemy' && e.vis && e.type === 3) { eng.addLight(e.x, 1.4, e.z, 5.5, 1.1, 0.4, 0.2); n++; }
      }
      if (h) for (const e of this.ents.values()) if (e.kind === 'npc' && e.vis && e.model.glow && Math.hypot(e.x - h.x, e.z - h.z) < 14) { const g = e.model.glow, c = G.rgbf(g.c); eng.addLight(e.x, g.y, e.z, g.r, c[0] * 0.9 * this.flick, c[1] * 0.9 * this.flick, c[2] * 0.9 * this.flick); break; }
    }

    draw(t, camOpts = {}) {
      const eng = this.eng, gl = this.gl, hero = this.hero;
      const [cx, cz] = this.camTarget();
      const dtc = 1 - Math.exp(-8 * (this.lastDt || 0.016)); this.cam.x += (cx - this.cam.x) * (this.cam.init ? dtc : 1); this.cam.z += (cz - this.cam.z) * (this.cam.init ? dtc : 1); this.cam.init = true;
      const sh = this.shake, ox = (Math.random() - 0.5) * sh * 0.5, oy = (Math.random() - 0.5) * sh * 0.4;
      eng.setCamera(this.cam.x, this.cam.z, Object.assign({ dist: this.camDist * this.zoom, pitch: this.camPitch, sx: ox, sy: oy, shift: 0.1 }, camOpts));
      this.collectLights(t);
      const hp = hero ? [hero.x, 0, hero.z] : [this.cam.x, 0, this.cam.z];
      eng.bindMain(this.w, this.h, hp, this.flick, this.amb, !this.opts.noCut);
      const u = eng.main.u, I = G.m4.ident();
      gl.uniformMatrix4fv(u.uModel, false, I);
      const ccx = (this.cam.x / CS) | 0, ccy = (this.cam.z / CS) | 0;
      for (const c of this.chunks.values()) if (c.mesh && Math.abs(c.cx - ccx) <= 4 && Math.abs(c.cy - ccy) <= 4) { gl.bindVertexArray(c.mesh.vao); gl.drawElements(gl.TRIANGLES, c.mesh.n, gl.UNSIGNED_INT, 0); }
      // antorchas (soportes + llama animada)
      gl.uniform1i(u.uMode, 1);
      if (!this.torchEnt) { this.torchEnt = new Ent('prop', 'torch'); this.torchEnt.model = G.getModel(gl, 'torch'); this.torchEnt.key = 'torch'; }
      const tm = this.torchEnt.model;
      for (const tr of this.torches) {
        if (Math.abs(tr.x - this.cam.x) > 22 || Math.abs(tr.z - this.cam.z) > 16 || !this.expl[((tr.ty | 0) * this.w + (tr.tx | 0))]) continue;
        const base = G.m4.mul(G.m4.trans(tr.x, 0.45, tr.z), G.m4.rotY(tr.yaw)), fl = 1 + Math.sin(t * 13 + tr.x * 7) * 0.18, Pm = new Float32Array(16);
        gl.uniform2f(u.uAnchor, tr.tx + 0.5, tr.ty + 0.5); gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform1f(u.uAlpha, 1);
        for (const part of tm.parts) {
          let M = base;
          if (part.name === 'flame') { const pv = part.pivot; M = G.m4.mul(base, G.m4.mul(G.m4.trans(pv[0], pv[1], pv[2]), G.m4.mul(G.m4.scale(1, fl, 1), G.m4.trans(-pv[0], -pv[1], -pv[2])))); }
          gl.uniformMatrix4fv(u.uModel, false, M); gl.bindVertexArray(part.mesh.vao); gl.drawElements(gl.TRIANGLES, part.mesh.n, gl.UNSIGNED_INT, 0);
        }
      }
      // sombras y entidades
      const list = [...this.ents.values()].filter((e) => (e.vis || e.kind === 'hero' || this.allVisible) && e.model);
      for (const e of list) if (e.kind !== 'proj' && e.kind !== 'prop') this.drawShadow(e, t);
      for (const e of list) { if (e.kind === 'hero' || (e.kind === 'enemy' && e.type === 4)) continue; this.drawModel(e, t); }
      for (const e of list) if (e.kind === 'enemy' && e.type === 4) this.drawModel(e, t);
      if (hero && hero.model) {
        if (!this.opts.noSilhouette) {                                                // silueta azulada cuando algo grande tapa al héroe (antes de dibujarlo, para evitar autooclusión)
          gl.depthFunc(gl.GREATER); gl.depthMask(false);
          this.drawModel(hero, t, { silhouette: true, noShadow: true });
          gl.depthFunc(gl.LESS); gl.depthMask(true);
        }
        this.drawModel(hero, t);
      }
      for (const d of this.dying) { const e = d.e, k = d.t / 0.45; e.hurt = 0; e.alpha = 1 - k; this.drawModel(e, t, { y: -k * 0.2 }); }
      gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform1f(u.uAlpha, 1);
      // partículas
      const [na, nb] = this.particles.pack(); gl.bindVertexArray(null);
      eng.drawParticles(this.particles.outN, na, false); eng.drawParticles(this.particles.outA, nb, true);
    }

    // retrato 3D (panel de unidad de Warcraft III) o vista completa de una clase: dibuja una entidad dentro de un rectángulo de pantalla
    drawPortrait(rect, t, ent = this.hero, cam = null, copyTo = null) {
      const hero = ent; if (!hero || !hero.model) return;
      const eng = this.eng, gl = this.gl, c = eng.canvas, sx = c.width / c.clientWidth, sy = c.height / c.clientHeight;
      const x = Math.round(rect.left * sx), w = Math.round(rect.width * sx), h = Math.round(rect.height * sy), y = Math.round(c.height - rect.bottom * sy);
      if (w < 4 || h < 4) return;
      gl.enable(gl.SCISSOR_TEST); gl.scissor(x, y, w, h); gl.viewport(x, y, w, h);
      gl.clearColor(0.09, 0.075, 0.065, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const cm = cam || { eye: [0.55, 1.08, 2.15], at: [0, 0.86, 0], fov: 0.62 };
      const V = G.m4.look(cm.eye, cm.at, [0, 1, 0]), P = G.m4.persp(cm.fov, w / h, 0.3, 30), pvp = this._pvp || (this._pvp = new Float32Array(16));
      G.m4.mul(P, V, pvp);                                                              // matriz propia: no pisa la del mundo (la usan las etiquetas)
      gl.useProgram(eng.main.p); gl.uniformMatrix4fv(eng.main.u.uVP, false, pvp); gl.uniform1i(eng.main.u.uMode, 3); gl.uniform1f(eng.main.u.uTime, t); gl.uniform1f(eng.main.u.uCut, 0); gl.uniform1i(eng.main.u.uNL, 0);
      const e = Object.assign(Object.create(Object.getPrototypeOf(hero)), hero); e.x = 0; e.z = 0; e.yaw = cm.spin ? t * 0.7 : 0.35 + Math.sin(t * 0.6) * 0.18; e.spd = 0; e.atk = -1; e.cast = 0; e.windup = false; e.hurt = hero.hurt || 0; if (cm.scale) e.scale = cm.scale;
      e.carg = hero.carg; this.drawModel(e, t, { y: 0 });
      if (copyTo) { if (copyTo.width !== w || copyTo.height !== h) { copyTo.width = w; copyTo.height = h; } copyTo.getContext('2d').drawImage(c, x, c.height - (y + h), w, h, 0, 0, w, h); }
      gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, c.width, c.height);
    }

    // proyección de un punto del mundo a píxeles CSS
    proj(x, y, z) { const c = this.eng.canvas; return G.m4.project(this.eng.vp, x, y, z, c.clientWidth, c.clientHeight); }
  }
  G.World = World;
  G.Ent = Ent;
})(window.G);
