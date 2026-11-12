'use strict';
// Motor de voxels: rejilla dispersa (Vox), constructor de mallas con oclusión ambiental por vértice (MeshBuilder)
// y utilidades para subir mallas a WebGL. Un voxel = entero 0xRRGGBB | (material << 24)
//   material: 0 normal · 1 agua · 2 lava · 3 emisivo (ignora la luz)
(function (G) {
  const AO = [0.52, 0.70, 0.86, 1.0];
  const FACES = [
    { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];
  // desplazamientos de muestreo de oclusión: por cara y esquina, [lado1, lado2, diagonal]
  FACES.forEach((f) => {
    const axes = [0, 1, 2].filter((k) => f.n[k] === 0);
    f.ao = f.c.map((cc) => {
      const d1 = cc[axes[0]] ? 1 : -1, d2 = cc[axes[1]] ? 1 : -1;
      const s1 = f.n.slice(), s2 = f.n.slice(), co = f.n.slice();
      s1[axes[0]] += d1; s2[axes[1]] += d2; co[axes[0]] += d1; co[axes[1]] += d2;
      return [s1, s2, co];
    });
  });
  G.FACES = FACES;

  class MeshBuilder {
    constructor() {
      this.cap = 2048; this.pos = new Float32Array(this.cap * 3); this.col = new Uint8Array(this.cap * 4); this.nrm = new Int8Array(this.cap * 4);
      this.icap = 4096; this.idx = new Uint32Array(this.icap); this.nv = 0; this.ni = 0;
    }
    grow() {
      this.cap *= 2;
      const p = new Float32Array(this.cap * 3); p.set(this.pos); this.pos = p;
      const c = new Uint8Array(this.cap * 4); c.set(this.col); this.col = c;
      const n = new Int8Array(this.cap * 4); n.set(this.nrm); this.nrm = n;
    }
    growI() { this.icap *= 2; const i = new Uint32Array(this.icap); i.set(this.idx); this.idx = i; }
    // x,y,z: voxel entero; s: tamaño del voxel en unidades de mundo; o*: origen; rgb 0..255; ao: 4 valores 0..3
    quad(f, x, y, z, s, ox, oy, oz, r, g, b, mat, ao) {
      if (this.nv + 4 > this.cap) this.grow();
      if (this.ni + 6 > this.icap) this.growI();
      const F = FACES[f], v0 = this.nv;
      for (let i = 0; i < 4; i++) {
        const c = F.c[i], k = v0 + i, a = mat === 3 ? 1 : AO[ao[i]];
        this.pos[k * 3] = ox + (x + c[0]) * s; this.pos[k * 3 + 1] = oy + (y + c[1]) * s; this.pos[k * 3 + 2] = oz + (z + c[2]) * s;
        this.col[k * 4] = r * a; this.col[k * 4 + 1] = g * a; this.col[k * 4 + 2] = b * a; this.col[k * 4 + 3] = mat;
        this.nrm[k * 4] = F.n[0] * 127; this.nrm[k * 4 + 1] = F.n[1] * 127; this.nrm[k * 4 + 2] = F.n[2] * 127;
      }
      this.nv += 4;
      const I = this.idx; let n = this.ni;
      if (ao[0] + ao[2] > ao[1] + ao[3]) { I[n++] = v0; I[n++] = v0 + 1; I[n++] = v0 + 2; I[n++] = v0; I[n++] = v0 + 2; I[n++] = v0 + 3; }
      else { I[n++] = v0 + 1; I[n++] = v0 + 2; I[n++] = v0 + 3; I[n++] = v0 + 1; I[n++] = v0 + 3; I[n++] = v0; }
      this.ni = n;
    }
    empty() { return this.nv === 0; }
  }
  G.MeshBuilder = MeshBuilder;

  class Vox {
    constructor(jit = 0.05) { this.m = new Map(); this.jit = jit; }
    static k(x, y, z) { return (x + 128) | ((y + 128) << 8) | ((z + 128) << 16); }
    set(x, y, z, c) { this.m.set(Vox.k(x, y, z), c); return this; }
    has(x, y, z) { return this.m.has(Vox.k(x, y, z)); }
    del(x, y, z) { this.m.delete(Vox.k(x, y, z)); return this; }
    // caja [x0,x1) x [y0,y1) x [z0,z1)
    box(x0, y0, z0, x1, y1, z1, c, j = this.jit) {
      const mat = c >>> 24, rgb = c & 0xffffff;
      for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) {
        let cc = rgb;
        if (j > 0) cc = G.shade(rgb, 1 + (G.hf(x, y, z) - 0.5) * 2 * j * (mat ? 0.4 : 1));
        this.m.set(Vox.k(x, y, z), cc | (mat << 24));
      }
      return this;
    }
    // caja y su reflejo respecto a x = 0
    bx(x0, y0, z0, x1, y1, z1, c, j) { this.box(x0, y0, z0, x1, y1, z1, c, j); this.box(-x1, y0, z0, -x0, y1, z1, c, j); return this; }
    // esfera aproximada
    ball(cx, cy, cz, r, c, j = this.jit) {
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++)
        if (x * x + y * y + z * z <= r * r + 0.3) this.box(cx + x, cy + y, cz + z, cx + x + 1, cy + y + 1, cz + z + 1, c, j);
      return this;
    }
  }
  G.Vox = Vox;
  G.E = (c) => (c & 0xffffff) | (3 << 24);               // marca un color como emisivo

  // Malla una rejilla Vox. Devuelve MeshBuilder en unidades de mundo (tamaño de voxel s, origen o)
  G.meshVox = (vox, s, ox = 0, oy = 0, oz = 0, bottom = false) => {
    const mb = new MeshBuilder(), ao = [0, 0, 0, 0];
    for (const [key, val] of vox.m) {
      const x = (key & 255) - 128, y = ((key >> 8) & 255) - 128, z = ((key >> 16) & 255) - 128;
      const mat = val >>> 24, r = (val >> 16) & 255, g = (val >> 8) & 255, b = val & 255;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        if (f === 3 && !bottom) continue;
        if (vox.has(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
        for (let i = 0; i < 4; i++) {
          const a = F.ao[i];
          const s1 = vox.has(x + a[0][0], y + a[0][1], z + a[0][2]), s2 = vox.has(x + a[1][0], y + a[1][1], z + a[1][2]), c = vox.has(x + a[2][0], y + a[2][1], z + a[2][2]);
          ao[i] = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
        }
        mb.quad(f, x, y, z, s, ox, oy, oz, r, g, b, mat, ao);
      }
    }
    return mb;
  };

  // Sube un MeshBuilder a la GPU
  G.gpuMesh = (gl, mb) => {
    if (!mb || mb.nv === 0) return null;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const mk = (data, loc, size, type, norm) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); return b;
    };
    const b0 = mk(mb.pos.subarray(0, mb.nv * 3), 0, 3, gl.FLOAT, false);
    const b1 = mk(mb.col.subarray(0, mb.nv * 4), 1, 4, gl.UNSIGNED_BYTE, true);
    const b2 = mk(mb.nrm.subarray(0, mb.nv * 4), 2, 4, gl.BYTE, true);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.idx.subarray(0, mb.ni), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: mb.ni, free() { gl.deleteVertexArray(vao); [b0, b1, b2, ib].forEach((b) => gl.deleteBuffer(b)); } };
  };
})(window.G);
