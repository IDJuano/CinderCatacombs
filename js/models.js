'use strict';
// Biblioteca de modelos voxel construidos por código (sin archivos externos).
// Cada modelo = piezas articuladas {name, parent, pivot, vox}. +z es el frente, +y arriba, origen entre los pies.
(function (G) {
  const { Vox, E } = G;
  const VS = 1 / 11;                                   // tamaño de voxel de los personajes (el terreno usa 1/4)
  const tier = (t, a) => a[G.clamp((t | 0) - 1, 0, a.length - 1)];

  function parts() {
    const P = [];
    const mk = (name, pivot, fn, parent = null, jit = 0.05) => { const v = new Vox(jit); fn(v); P.push({ name, pivot, vox: v, parent }); return v; };
    return { P, mk };
  }

  // ---------- humanoide base: cabeza 6x6x6, torso 6x5x4, brazos y piernas de 2 voxels ----------
  function human(o) {
    const { P, mk } = parts(), sk = o.skin ?? 0xe0b08a, j = o.jit ?? 0.05;
    mk('legR', [-2, 3, 0], (v) => { v.box(-3, 1, -1, -1, 3, 1, o.leg); v.box(-3, 0, -1, -1, 1, 2, o.boot); if (o.legRFn) o.legRFn(v); }, null, j);
    mk('legL', [2, 3, 0], (v) => { v.box(1, 1, -1, 3, 3, 1, o.leg); v.box(1, 0, -1, 3, 1, 2, o.boot); if (o.legLFn) o.legLFn(v); }, null, j);
    mk('torso', [0, 3, 0], (v) => { v.box(-3, 3, -2, 3, 8, 2, o.torso); if (o.torsoFn) o.torsoFn(v); }, null, j);
    mk('head', [0, 8, 0], (v) => {
      v.box(-3, 8, -3, 3, 14, 3, sk);
      if (o.faceFn) o.faceFn(v); else { v.set(-2, 10, 2, 0x1a1410); v.set(1, 10, 2, 0x1a1410); v.box(-1, 9, 2, 1, 10, 3, 0xa8604a); v.set(0, 10, 3, G.shade(sk, 0.85)); }
      if (o.headFn) o.headFn(v);
    }, 'torso', j);
    mk('armR', [-4, 8, 0], (v) => { v.box(-5, 3, -1, -3, 8, 1, o.arm ?? o.torso); v.box(-5, 3, -1, -3, 4, 1, o.hand ?? sk); if (o.armRFn) o.armRFn(v); }, 'torso', j);
    mk('armL', [4, 8, 0], (v) => { v.box(3, 3, -1, 5, 8, 1, o.arm ?? o.torso); v.box(3, 3, -1, 5, 4, 1, o.hand ?? sk); if (o.armLFn) o.armLFn(v); }, 'torso', j);
    if (o.extra) o.extra(mk);
    return P;
  }
  const hood = (v, c) => { v.box(-3, 11, -3, 3, 14, 3, c); v.box(-3, 8, -3, -2, 11, 3, c); v.box(2, 8, -3, 3, 11, 3, c); v.box(-3, 8, -3, 3, 11, -1, c); };

  // ================= HÉROES =================
  const HERO = [];
  HERO[0] = (w, a) => {                                  // Guerrero: yelmo con penacho, escudo y espada
    const plate = tier(a, [0x7a6652, 0x8f98a6, 0xb9c5d6, 0xe2c46a]), blade = tier(w, [0x8a7f72, 0xb9bec6, 0xe4ecf4, 0xffeaa6]);
    return human({
      torso: 0xa8322a, leg: 0x4a4f5c, boot: 0x2f333d, arm: tier(a, [0x7a6652, 0x8f98a6, 0xa9b4c4, 0xd8b85a]),
      torsoFn(v) { v.box(-2, 4, 2, 2, 8, 3, plate); v.box(-3, 3, -2, 3, 4, 2, 0x5a3a1e); v.box(-1, 3, 2, 1, 4, 3, 0xd6aa4f); v.box(-4, 7, -1, -3, 9, 1, plate); v.box(3, 7, -1, 4, 9, 1, plate); },
      headFn(v) {
        v.box(-3, 11, -3, 3, 14, 3, plate); v.box(-3, 8, -3, -2, 11, 3, plate); v.box(2, 8, -3, 3, 11, 3, plate); v.box(-3, 8, -3, 3, 11, -1, plate); v.box(0, 8, 2, 1, 11, 3, plate);
        v.box(-1, 14, -3, 1, 16, 2, 0xc03a2e, 0.1); v.box(-1, 16, -3, 1, 17, -1, 0xc03a2e);
      },
      armRFn(v) { v.box(-5, 2, 1, -4, 4, 2, 0x5a3a1e); v.box(-6, 4, 1, -3, 5, 2, 0xd6aa4f); v.box(-5, 5, 0, -4, 13, 2, blade, 0.03); v.set(-5, 13, 1, blade); if (w >= 4) v.box(-5, 6, 0, -4, 12, 1, E(0xffd060)); },
      armLFn(v) { v.box(5, 3, -2, 6, 9, 3, 0x6b4a2b); v.box(6, 4, -1, 7, 8, 2, plate); v.box(6, 5, 0, 7, 7, 1, 0xd6aa4f); },
    });
  };
  HERO[1] = (w, a) => {                                  // Mago: sombrero puntiagudo, barba, bastón con orbe
    const robe = tier(a, [0x4a5e9a, 0x2f4fa8, 0x3a3fb8, 0x5a2fb8]), orb = tier(w, [0xcfe8ff, 0x5ae6ff, 0xc050ff, 0xffd34a]), trim = 0xd6aa4f;
    return human({
      torso: robe, leg: robe, boot: 0x2a2018, arm: robe,
      torsoFn(v) { v.box(-3, 1, -2, 3, 3, 3, robe); v.box(-3, 1, -2, 3, 2, 3, trim); v.box(-3, 5, -2, 3, 6, 3, 0x7a3fa8); v.box(-1, 6, 2, 1, 8, 3, trim); },
      headFn(v) {
        v.box(-2, 7, 2, 2, 10, 3, 0xe8e6e0); v.box(-1, 6, 2, 1, 7, 3, 0xe8e6e0);
        v.box(-4, 12, -4, 4, 13, 4, robe); v.box(-3, 13, -3, 3, 15, 3, robe); v.box(-3, 13, -3, 3, 14, 3, trim); v.box(-2, 15, -2, 2, 17, 2, robe); v.box(-1, 17, -1, 1, 19, 1, robe); v.set(0, 19, 0, robe); v.set(0, 20, -1, robe);
        v.set(-2, 10, 2, 0x1a1410); v.set(1, 10, 2, 0x1a1410);
      },
      armRFn(v) { v.box(-6, 0, 1, -5, 16, 2, 0x6b4a2b); v.box(-7, 15, 0, -6, 17, 3, 0x6b4a2b); v.box(-5, 15, 0, -4, 17, 3, 0x6b4a2b); v.ball(-6, 17, 1, 2, E(orb)); v.set(-6, 17, 3, E(0xffffff)); },
    });
  };
  HERO[2] = (w, a) => {                                  // Arquero: capucha verde, carcaj, arco
    const tun = tier(a, [0x5a7a3a, 0x4f7a3a, 0x3f8a52, 0x3fa089]), bow = tier(w, [0x7a5a2b, 0x8a5a2b, 0xa0703a, 0xd6aa4f]);
    return human({
      torso: tun, leg: 0x5a4630, boot: 0x3a2a1a, arm: tun,
      torsoFn(v) { v.box(-3, 3, -2, 3, 4, 2, 0x6b4a2b); v.box(-2, 4, 2, 2, 8, 3, 0x7a5230); v.box(-2, 3, -3, 1, 10, -2, 0x7a5230); v.set(-1, 10, -3, 0xe8e2c8); v.set(0, 11, -3, 0xe8e2c8); v.set(-2, 10, -3, 0xc03a2e); },
      headFn(v) { hood(v, 0x2f6b3a); v.box(-1, 14, -3, 1, 15, 0, 0x2f6b3a); },
      armLFn(v) { const bul = [0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0]; for (let i = 0; i < 11; i++) v.box(5, 2 + i, bul[i], 6, 3 + i, bul[i] + 1, bow, 0.03); v.box(5, 3, 0, 6, 12, 1, 0xe8e2c8, 0); },
    });
  };
  HERO[3] = (w, a) => {                                  // Pícaro: capucha oscura, antifaz, bufanda roja, dagas
    const lea = tier(a, [0x3a364e, 0x34304a, 0x2c2a5a, 0x4a2a6a]), blade = tier(w, [0x8a8f98, 0xc9d0da, 0xe4ecf4, 0xd0b0ff]);
    return human({
      torso: lea, leg: 0x2a2838, boot: 0x1a1a22, arm: lea, hand: 0x1a1a22,
      torsoFn(v) { v.box(-3, 3, -2, 3, 4, 2, 0x1a1a22); v.box(2, 3, 0, 4, 5, 2, 0x5a3a1e); v.box(-2, 5, 2, 3, 6, 3, 0x5a3a1e); v.box(-3, 7, -2, 3, 8, 3, 0x9a2a2a); v.box(-1, 2, -3, 1, 8, -2, 0x9a2a2a); },
      headFn(v) { hood(v, 0x2b2b35); v.box(-1, 14, -3, 1, 15, -1, 0x2b2b35); v.box(-2, 8, 2, 2, 10, 3, 0x14141c); v.set(-2, 10, 2, E(0xffe28a)); v.set(1, 10, 2, E(0xffe28a)); },
      armRFn(v) { v.box(-5, 2, 1, -4, 3, 2, 0x3a2a1a); v.box(-6, 3, 1, -3, 4, 2, 0x8a8f98); v.box(-5, 4, 1, -4, 10, 2, blade, 0.03); v.set(-5, 10, 1, blade); },
      armLFn(v) { v.box(4, 2, 1, 5, 3, 2, 0x3a2a1a); v.box(3, 3, 1, 6, 4, 2, 0x8a8f98); v.box(4, 4, 1, 5, 8, 2, blade, 0.03); },
    });
  };
  HERO[4] = (w, a) => {                                  // Clérigo: túnica blanca y oro, halo, maza
    const rob = tier(a, [0xd8d2be, 0xe9e4d2, 0xf2eedd, 0xfff6d8]), gold = 0xd6aa4f, mace = tier(w, [0x7a7a80, 0xa0a4ac, 0xd6aa4f, 0xffe58a]);
    return human({
      torso: rob, leg: 0xd8d2be, boot: 0x6b4a2b, arm: rob,
      torsoFn(v) { v.box(-3, 1, -2, 3, 3, 3, rob); v.box(-3, 1, -2, 3, 2, 3, gold); v.box(-3, 4, -2, 3, 5, 3, gold); v.box(-1, 5, 2, 1, 8, 3, E(gold)); v.box(-2, 6, 2, 2, 7, 3, E(gold)); },
      headFn(v) {
        v.box(-3, 12, -3, 3, 14, 3, 0x7b5a34); v.box(-3, 8, -3, 3, 12, -2, 0x7b5a34); v.box(-3, 10, -3, -2, 12, 3, 0x7b5a34); v.box(2, 10, -3, 3, 12, 3, 0x7b5a34); v.box(-3, 11, -3, 3, 12, 3, gold);
        v.box(-3, 16, -3, 3, 17, 3, E(0xffe28a)); for (let x = -2; x < 2; x++) for (let z = -2; z < 2; z++) v.del(x, 16, z);
      },
      armRFn(v) { v.box(-6, 0, 1, -5, 10, 2, 0x6b4a2b); v.ball(-6, 11, 1, 2, mace); v.set(-6, 14, 1, mace); v.set(-9 + 2, 11, 1, mace); v.set(-4, 11, 1, mace); v.set(-6, 11, 3, mace); },
    });
  };
  G.MODELS = {};
  G.MODELS.hero = (cls, w, a) => ({ vs: VS, h: 1.5, r: 0.38, parts: HERO[cls] ? HERO[cls](w, a) : HERO[0](w, a) });

  // ================= ENEMIGOS =================
  const bone = 0xd9d3bd, soot = 0x3a3330;
  function skeleton(o = {}) {
    const { P, mk } = parts(), bn = o.bone ?? bone;
    const legs = (v, x0) => { v.box(x0, 0, 0, x0 + 1, 3, 1, bn); v.box(x0 - 1, 0, 0, x0 + 2, 1, 2, bn); };
    mk('legR', [-2, 3, 0], (v) => legs(v, -3)); mk('legL', [2, 3, 0], (v) => legs(v, 2));
    mk('torso', [0, 3, 0], (v) => {
      v.box(-2, 3, -1, 2, 4, 1, bn); v.box(0, 4, -1, 1, 9, 0, bn);
      for (const y of [5, 7]) v.box(-2, y, -1, 2, y + 1, 1, bn);
      v.box(-2, 8, -1, 2, 9, 1, o.armor ?? bn); v.set(0, 6, 0, E(o.ember ?? 0xff7a2a));
      if (o.torsoFn) o.torsoFn(v);
    });
    mk('head', [0, 9, 0], (v) => {
      v.box(-3, 9, -3, 3, 15, 3, bn); v.box(-2, 9, 2, 2, 10, 3, G.shade(bn, 0.8));
      v.box(-2, 11, 2, 0, 13, 3, 0x14100e); v.box(0, 11, 2, 2, 13, 3, 0x14100e); v.set(-1, 12, 2, E(o.eye ?? 0xff8a2a)); v.set(1, 12, 2, E(o.eye ?? 0xff8a2a));
      for (let x = -2; x < 2; x += 2) v.set(x, 9, 2, 0x14100e);
      if (o.headFn) o.headFn(v);
    }, 'torso');
    mk('armR', [-3, 8, 0], (v) => { v.box(-4, 3, 0, -3, 8, 1, bn); v.box(-4, 3, -1, -3, 4, 1, bn); if (o.armRFn) o.armRFn(v); }, 'torso');
    mk('armL', [3, 8, 0], (v) => { v.box(3, 3, 0, 4, 8, 1, bn); v.box(3, 3, -1, 4, 4, 1, bn); if (o.armLFn) o.armLFn(v); }, 'torso');
    for (const p of P) if (o.soot) for (const [k, val] of p.vox.m) if (G.hash(k, 7) % 7 === 0 && !(val >>> 24)) p.vox.m.set(k, soot);
    if (o.extra) o.extra(mk);
    return P;
  }

  G.MODELS.enemy = (t, elite) => {
    const E3 = (c) => E(c);
    switch (t) {
      case 0: { // Rata
        const { P, mk } = parts(), fur = 0x7b6350, belly = 0xa89078, pink = 0xc88f8f;
        mk('body', [0, 2, 0], (v) => { v.box(-2, 1, -4, 2, 4, 3, fur, 0.08); v.box(-2, 1, -4, 2, 2, 3, belly); v.box(-1, 4, -3, 1, 5, 2, fur, 0.1); });
        mk('head', [0, 2, 3], (v) => { v.box(-1, 1, 3, 1, 4, 6, fur); v.set(0, 2, 6, pink); v.box(-2, 4, 3, -1, 6, 4, pink); v.box(1, 4, 3, 2, 6, 4, pink); v.set(-1, 3, 5, E(0xff3a2a)); v.set(0, 3, 5, E(0xff3a2a)); v.set(-1, 1, 5, 0xf0e8d0); }, 'body');
        mk('tail', [0, 2, -4], (v) => { v.box(0, 2, -8, 1, 3, -4, pink); v.box(0, 3, -10, 1, 4, -8, pink); }, 'body');
        mk('legF', [0, 1, 2], (v) => { v.box(-2, 0, 1, -1, 1, 3, fur); v.box(1, 0, 1, 2, 1, 3, fur); }, null);
        mk('legB', [0, 1, -2], (v) => { v.box(-2, 0, -3, -1, 1, -1, fur); v.box(1, 0, -3, 2, 1, -1, fur); }, null);
        return { vs: VS, h: 0.55, r: 0.3, parts: P };
      }
      case 1: { // Murciélago
        const { P, mk } = parts(), c = 0x4a3560, memb = 0x6a4a82;
        mk('body', [0, 3, 0], (v) => { v.box(-1, 1, -1, 1, 5, 2, c); v.box(-1, 5, 0, 1, 7, 2, c); v.set(-1, 7, 0, c); v.set(0, 7, 0, c); v.set(-1, 6, 2, E(0xff3a3a)); v.set(0, 6, 2, E(0xff3a3a)); v.set(-1, 5, 2, 0xffffff); v.set(0, 5, 2, 0xffffff); });
        const wing = (sx) => (v) => { for (let i = 0; i < 7; i++) { const zn = -2 + (i > 3 ? i - 3 : 0), zx = 2 - (i > 4 ? i - 4 : 0), x0 = sx > 0 ? 1 + i : -2 - i; v.box(x0, 3, zn, x0 + 1, 4, zx, memb, 0.06); v.set(x0, 3, zn, c); v.set(x0, 3, zx - 1, c); } };
        mk('wingR', [-1, 3, 0], wing(-1), 'body'); mk('wingL', [1, 3, 0], wing(1), 'body');
        return { vs: VS, h: 0.6, r: 0.28, fly: 0.55, parts: P };
      }
      case 2: // Esqueleto ardido
        return { vs: VS, h: 1.45, r: 0.36, parts: skeleton({ soot: true, armRFn(v) { v.box(-5, 2, 1, -4, 3, 2, 0x5a3a1e); v.box(-5, 3, 1, -4, 12, 2, 0x8a7a68, 0.08); v.box(-6, 3, 1, -3, 4, 2, 0x6a4a2a); v.set(-5, 12, 1, 0x8a7a68); } }) };
      case 3: { // Rey Ceniciento
        const arm = 0x2a2630, hi = 0x4a4452, cr = 0xe8b030;
        const P = human({
          torso: arm, leg: 0x1d1b22, boot: 0x14121a, arm: arm, hand: bone, skin: bone, jit: 0.07,
          torsoFn(v) { v.box(-3, 5, 2, 3, 8, 3, hi); v.set(-1, 6, 2, E(0xff5a1a)); v.set(0, 6, 2, E(0xff5a1a)); v.set(1, 7, 2, E(0xff7a2a)); v.box(-4, 8, -2, -3, 10, 2, hi); v.box(3, 8, -2, 4, 10, 2, hi); v.box(-5, 9, -1, -4, 12, 0, hi); v.box(4, 9, -1, 5, 12, 0, hi); v.box(-3, 3, -2, 3, 4, 2, 0x6a5a2a); },
          faceFn(v) { v.box(-2, 10, 2, 0, 12, 3, 0x14100e); v.box(0, 10, 2, 2, 12, 3, 0x14100e); v.set(-1, 11, 2, E(0xff2a1a)); v.set(1, 11, 2, E(0xff2a1a)); v.box(-2, 8, 2, 2, 9, 3, 0x14100e); },
          headFn(v) { v.box(-3, 14, -3, 3, 15, 3, cr); for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2], [-1, -3], [0, 2]]) { v.box(x, 15, z, x + 1, 17, z + 1, cr); v.set(x, 17, z, E(0xff7a2a)); } for (const [x, z] of [[-3, -3], [2, 2], [2, -3], [-3, 2]]) v.set(x, 18, z, E(0xffd34a)); },
          armRFn(v) { v.box(-6, 2, 1, -5, 4, 2, 0x5a3a1e); v.box(-7, 4, 0, -4, 5, 3, cr); v.box(-6, 5, 0, -5, 20, 2, 0x2a2a36, 0.04); v.box(-6, 6, 0, -5, 19, 1, E(0xff4a1a)); v.set(-6, 20, 1, 0x2a2a36); },
          extra(mk) { mk('cape', [0, 9, -2], (v) => { v.box(-4, 1, -4, 4, 9, -2, 0x6a1a1a, 0.08); v.box(-4, 1, -4, 4, 2, -2, 0x2a0a0a); }, 'torso'); },
        });
        return { vs: VS, h: 1.9, r: 0.5, parts: P, scale: 1.5 };
      }
      case 4: { // Ánima errante (fantasma)
        const { P, mk } = parts(), pale = 0xbfe3ee, mid = 0x8fc0d4;
        mk('body', [0, 6, 0], (v) => { v.ball(0, 11, 0, 3, pale, 0.04); v.box(-3, 5, -2, 3, 9, 3, pale); v.box(-2, 3, -2, 2, 5, 2, mid); v.box(-1, 2, -1, 1, 3, 1, mid); v.set(-1, 11, 3, 0x0a1218); v.set(1, 11, 3, 0x0a1218); v.box(-1, 8, 3, 1, 9, 4, 0x0a1218); v.set(0, 6, 3, E(0x7ae8ff)); v.set(-2, 11, 3, 0x0a1218); v.set(2, 11, 3, 0x0a1218); });
        mk('armR', [-3, 8, 0], (v) => { v.box(-7, 5, 0, -3, 7, 2, mid); v.box(-8, 4, 0, -7, 6, 2, pale); }, 'body');
        mk('armL', [3, 8, 0], (v) => { v.box(3, 5, 0, 7, 7, 2, mid); v.box(7, 4, 0, 8, 6, 2, pale); }, 'body');
        mk('tail', [0, 3, 0], (v) => { v.box(-1, 0, -1, 1, 2, 1, G.shade(mid, 0.9)); v.set(0, -1, 0, mid); }, 'body');
        return { vs: VS, h: 1.3, r: 0.32, fly: 0.3, alpha: 0.72, parts: P };
      }
      case 5: // Arquero calcinado
        return { vs: VS, h: 1.45, r: 0.36, parts: skeleton({ bone: 0x8a8272, soot: true, eye: 0x5cff6a, ember: 0x5cff6a, armor: 0x2f4a2a,
          headFn(v) { v.box(-3, 12, -3, 3, 15, 3, 0x2a3a28); v.box(-3, 9, -3, -2, 12, 3, 0x2a3a28); v.box(2, 9, -3, 3, 12, 3, 0x2a3a28); v.box(-3, 9, -3, 3, 12, -1, 0x2a3a28); v.box(-1, 15, -3, 1, 16, 0, 0x2a3a28); },
          torsoFn(v) { v.box(-2, 3, -3, 1, 10, -2, 0x3a2a1a); v.set(-1, 10, -3, 0x5cff6a); v.set(0, 11, -3, 0x5cff6a); },
          armLFn(v) { const bw = [0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0]; for (let i = 0; i < 11; i++) v.box(5, 2 + i, bw[i], 6, 3 + i, bw[i] + 1, 0x4a3a2a, 0.03); v.box(5, 3, 0, 6, 12, 1, 0x9a9a8a, 0); } }) };
      default: { // Gólem de hollín
        const { P, mk } = parts(), rock = 0x4b3f3a, rock2 = 0x5d4e46, em = 0xff6a1a;
        mk('legR', [-2, 4, 0], (v) => { v.box(-4, 0, -2, -1, 4, 2, rock, 0.09); v.box(-4, 0, -2, -1, 1, 3, rock2); });
        mk('legL', [2, 4, 0], (v) => { v.box(1, 0, -2, 4, 4, 2, rock, 0.09); v.box(1, 0, -2, 4, 1, 3, rock2); });
        mk('torso', [0, 4, 0], (v) => { v.box(-5, 4, -3, 5, 11, 3, rock, 0.09); v.box(-5, 9, -3, 5, 11, 3, rock2); v.box(-1, 6, 3, 1, 8, 4, E(em)); for (let i = 0; i < 14; i++) { const h = G.hash(i, 3); v.set((h % 9) - 4, 4 + (h >> 4) % 6, 3, E(0xd8501a)); } });
        mk('head', [0, 11, 0], (v) => { v.box(-3, 11, -2, 3, 15, 2, rock2, 0.08); v.set(-2, 13, 2, E(0xffd34a)); v.set(1, 13, 2, E(0xffd34a)); v.set(-1, 13, 2, E(em)); v.set(0, 13, 2, E(em)); v.box(-2, 11, 2, 2, 12, 3, 0x1a1412); }, 'torso');
        mk('armR', [-5, 10, 0], (v) => { v.box(-8, 3, -2, -5, 10, 2, rock, 0.09); v.box(-9, 0, -3, -5, 4, 3, rock2); v.set(-6, 6, 2, E(em)); }, 'torso');
        mk('armL', [5, 10, 0], (v) => { v.box(5, 3, -2, 8, 10, 2, rock, 0.09); v.box(5, 0, -3, 9, 4, 3, rock2); v.set(6, 6, 2, E(em)); }, 'torso');
        return { vs: VS, h: 1.45, r: 0.5, parts: P, scale: 1.15 };
      }
    }
  };

  // ================= PNJ =================
  G.MODELS.npc = (k) => {
    if (k === 'S') {                                     // Vela, la mercader: capa cálida, mochila enorme, vela sobre la cabeza
      const P = human({
        torso: 0x8a6a3a, leg: 0x5a4630, boot: 0x3a2a1a, arm: 0x8a6a3a, skin: 0xd8d2be,
        torsoFn(v) { v.box(-3, 1, -2, 3, 3, 3, 0x8a6a3a); v.box(-3, 1, -2, 3, 2, 3, 0xd6aa4f); v.box(-3, 5, -2, 3, 6, 3, 0x5a3a1e); v.box(-1, 6, 2, 1, 7, 3, 0xf0d070); },
        headFn(v) { hood(v, 0x6a4a2a); v.box(-3, 8, -3, 3, 12, -2, 0x6a4a2a); v.box(-1, 14, -1, 1, 17, 1, 0xf0e8c8); v.box(-1, 17, -1, 1, 19, 1, E(0xffd34a)); v.set(0, 19, 0, E(0xffffff)); },
        extra(mk) { mk('pack', [0, 6, -3], (v) => { v.box(-4, 2, -7, 4, 10, -2, 0x6b4a2b, 0.07); v.box(-4, 8, -7, 4, 10, -2, 0x8a5a2b); v.box(-3, 3, -8, -1, 5, -7, E(0xff4a3a)); v.box(1, 3, -8, 3, 5, -7, E(0x5a7bff)); v.box(-1, 6, -8, 1, 8, -7, E(0xffd34a)); v.box(-3, 10, -6, 3, 11, -3, 0xd8d2be); }, 'torso'); },
      });
      return { vs: VS, h: 1.7, r: 0.4, parts: P, glow: { c: 0xffc860, r: 4.2, y: 1.3 } };
    }
    if (k === 'F') {                                     // Maese Brasero: herrero con barba naranja, yunque y horno
      const P = human({
        torso: 0x5a3a1e, leg: 0x3a2a1a, boot: 0x2a2018, arm: 0xd89a70, skin: 0xd89a70, hand: 0xd89a70,
        torsoFn(v) { v.box(-3, 3, 2, 3, 7, 3, 0x2a2018); v.box(-3, 7, -2, 3, 8, 2, 0xd89a70); },
        headFn(v) { v.box(-3, 5, 2, 3, 9, 3, 0xd9722a); v.box(-2, 3, 2, 2, 5, 3, 0xd9722a); v.box(-3, 13, -3, 3, 14, 3, 0x2a2018); v.box(-3, 11, -3, 3, 12, 3, 0x6b4a2b); v.box(-2, 11, 3, 0, 12, 4, 0x8ad0ff); v.box(0, 11, 3, 2, 12, 4, 0x8ad0ff); },
        armRFn(v) { v.box(-5, 2, 1, -4, 3, 2, 0x6b4a2b); v.box(-5, 3, 1, -4, 8, 2, 0x6b4a2b); v.box(-7, 8, 0, -2, 11, 3, 0x6a6e78); },
        extra(mk) {
          mk('anvil', [0, 0, 6], (v) => { v.box(-2, 0, 4, 2, 2, 8, 0x3a3a42); v.box(-3, 2, 3, 3, 4, 9, 0x5a5e68); v.box(-4, 3, 5, -3, 4, 7, 0x5a5e68); v.box(-1, 4, 5, 1, 5, 7, E(0xff7a2a)); });
          mk('furnace', [7, 0, -3], (v) => { v.box(3, 0, -7, 11, 9, -1, 0x5d554e, 0.08); v.box(4, 9, -6, 10, 13, -2, 0x4a443f); v.box(5, 2, -1, 10, 6, 0, E(0xff6a1a)); v.box(6, 3, -1, 9, 5, 0, E(0xffd34a)); });
        },
      });
      return { vs: VS, h: 1.4, r: 0.8, parts: P, glow: { c: 0xff7a2a, r: 5, y: 1.0 } };
    }
    // Altar / Eco (E)
    const { P, mk } = parts();
    mk('base', [0, 0, 0], (v) => { v.box(-4, 0, -4, 4, 2, 4, 0x5a5560, 0.08); v.box(-3, 2, -3, 3, 6, 3, 0x6a6470); v.box(-4, 6, -4, 4, 7, 4, 0x5a5560); v.box(-2, 7, -2, 2, 8, 2, E(0xc050d8)); });
    mk('orb', [0, 11, 0], (v) => { v.ball(0, 11, 0, 2, E(0xff6cf0)); v.set(0, 11, 2, E(0xffffff)); v.set(0, 14, 0, E(0xffc0ff)); });
    mk('ring', [0, 11, 0], (v) => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; v.set(Math.round(Math.cos(a) * 4.3), 11, Math.round(Math.sin(a) * 4.3), E(0xc050d8)); } });
    return { vs: VS, h: 1.3, r: 0.45, parts: P, glow: { c: 0xd060ff, r: 5, y: 1.1 } };
  };

  // ================= OBJETOS EN EL SUELO =================
  G.MODELS.item = (ch, id = '') => {
    const { P, mk } = parts();
    const one = (fn, h = 0.5) => { mk('main', [0, 0, 0], fn); return { vs: 1 / 12, h, r: 0.25, parts: P }; };
    switch (ch) {
      case '$': return one((v) => { v.box(-3, 0, -3, 3, 1, 2, 0xd9a82a); v.box(-2, 1, -2, 2, 2, 2, 0xf2c53d); v.box(-1, 2, -1, 1, 3, 1, 0xffe27a); v.box(2, 0, 1, 4, 1, 3, 0xf2c53d); v.set(-3, 1, 0, 0xffe27a); v.set(0, 3, 0, E(0xfff0a0)); v.set(3, 1, 2, E(0xffe27a)); }, 0.35);
      case 'H': case 'M': { const c = ch === 'H' ? 0xd0302f : 0x2f56d8, g = ch === 'H' ? 0xff6a5a : 0x6ab0ff;
        return one((v) => { v.box(-2, 0, -2, 2, 4, 2, c, 0.04); v.box(-1, 1, -1, 1, 3, 1, E(g)); v.box(-1, 4, -1, 1, 6, 1, 0xcfd8e0); v.box(-1, 6, -1, 1, 7, 1, 0x8a5a2b); v.set(-2, 2, 1, 0xffffff); }, 0.55); }
      case 'B': return one((v) => { v.ball(0, 3, 0, 3, 0x2a2a32); v.set(-1, 5, 1, 0x6a6a76); v.box(0, 6, 0, 1, 8, 1, 0x8a6a3a); v.set(0, 8, 0, E(0xffd34a)); v.set(0, 9, 0, E(0xff7a2a)); }, 0.6);
      case 'K': { const gc = [0x4cd05c, 0x5ae6ff, 0xc050d8, 0xffd34a, 0xff6a3a][G.hash(id.length, id.charCodeAt(id.length - 1) || 1) % 5];
        return one((v) => { v.box(-3, 0, -2, 1, 2, 2, 0x6a6560, 0.08); v.box(0, 0, 0, 3, 3, 3, 0x57524d, 0.08); v.box(-1, 2, -1, 1, 5, 1, E(gc)); v.set(0, 5, 0, E(0xffffff)); }, 0.5); }
      case 'T': return one((v) => { v.box(-2, 0, -2, 2, 1, 2, 0xd9a82a); v.box(-1, 1, -1, 1, 3, 1, 0xf2c53d); v.box(-3, 3, -3, 3, 6, 3, 0xf2c53d, 0.04); v.box(-2, 6, -2, 2, 7, 2, E(0xff5a8a)); v.set(0, 7, 0, E(0xffffff)); }, 0.7);
      case 'C': return one((v) => { v.box(-5, 0, -3, 5, 5, 3, 0x7a4a24, 0.06); v.box(-5, 5, -2, 5, 7, 2, 0x8a5a2b); v.box(-4, 7, -1, 4, 8, 1, 0x8a5a2b); v.box(-5, 0, -3, -4, 7, 3, 0x6a6e78); v.box(4, 0, -3, 5, 7, 3, 0x6a6e78); v.box(-1, 3, 3, 1, 6, 4, E(0xffd34a)); v.box(-5, 4, 2, 5, 5, 3, 0x6a6e78); }, 0.7);
      default: { // 'G' equipo: forma según el id (wXc/aXc/mXc), con brillo por nivel
        const kind = id[0], cl = id[id.length - 1], t = +id[1] || 1, col = [0xc8c8c8, 0x7a9cff, 0xffe060, 0xff9a2a][G.clamp(t - 1, 0, 3)];
        return one((v) => {
          if (kind === 'w') {
            if (cl === 'M') { v.box(0, 0, 0, 1, 10, 1, 0x6b4a2b); v.ball(0, 11, 0, 2, E(col)); }
            else if (cl === 'A') { for (let i = 0; i < 9; i++) v.box(0, i, [0, 0, 1, 1, 2, 2, 1, 1, 0][i], 1, i + 1, [0, 0, 1, 1, 2, 2, 1, 1, 0][i] + 1, 0x8a5a2b); }
            else if (cl === 'C') { v.box(0, 0, 0, 1, 7, 1, 0x6b4a2b); v.ball(0, 8, 0, 2, col); }
            else if (cl === 'P') { v.box(-1, 0, 0, 2, 1, 1, 0x6b4a2b); v.box(0, 1, 0, 1, 8, 1, col); }
            else { v.box(0, 0, 0, 1, 2, 1, 0x5a3a1e); v.box(-2, 2, 0, 3, 3, 1, 0xd6aa4f); v.box(0, 3, 0, 1, 12, 1, col); }
          } else if (kind === 'a') { v.box(-3, 0, -1, 3, 6, 2, col, 0.06); v.box(-5, 4, -1, -3, 7, 2, col); v.box(3, 4, -1, 5, 7, 2, col); v.box(-1, 5, -1, 1, 7, 2, 0x14100e); v.box(-1, 2, 2, 1, 4, 3, E(0xffd34a)); }
          else { v.box(-1, 5, 0, 2, 6, 1, 0xd6aa4f); v.box(-2, 3, 0, -1, 6, 1, 0xd6aa4f); v.box(2, 3, 0, 3, 6, 1, 0xd6aa4f); v.box(-1, 2, 0, 2, 3, 1, 0xd6aa4f); v.box(-1, 3, 0, 1, 5, 1, E(col)); }
        }, 0.9);
      }
    }
  };

  // ================= PROYECTILES, ANTORCHA, BRASERO =================
  G.MODELS.proj = (kind) => {
    const { P, mk } = parts();
    const one = (fn, s = 1 / 12) => { mk('main', [0, 0, 0], fn, null, 0.02); return { vs: s, h: 0.4, r: 0.1, parts: P }; };
    switch (kind) {
      case 'rayo': return one((v) => { v.ball(0, 0, 0, 2, E(0xd060ff)); v.ball(0, 0, 0, 1, E(0xffffff)); v.box(-1, -1, -5, 1, 1, -3, E(0x9a40e0)); });
      case 'bola': return one((v) => { v.ball(0, 0, 0, 3, E(0xff7a1a)); v.ball(0, 0, 0, 2, E(0xffd34a)); v.box(-1, -1, -6, 1, 1, -3, E(0xff5a1a)); });
      case 'bolaRey': return one((v) => { v.ball(0, 0, 0, 3, E(0xe8281a)); v.ball(0, 0, 0, 2, E(0x300808)); v.set(0, 0, 3, E(0xff8a3a)); v.box(-1, -1, -6, 1, 1, -3, E(0x8a1a1a)); });
      case 'flecha': return one((v) => { v.box(0, 0, -4, 1, 1, 3, 0x9a9a8a); v.box(0, 0, 3, 1, 1, 5, E(0x5cff6a)); v.box(-1, 0, -4, 2, 1, -2, 0x3f8a52); }, 1 / 11);
      default: return one((v) => { v.box(0, 0, -4, 1, 1, 3, 0xcdbb90); v.box(0, 0, 3, 1, 1, 5, 0xdfe6ee); v.box(-1, 0, -4, 2, 1, -2, 0xffffff); }, 1 / 11);
    }
  };
  G.MODELS.torch = () => {
    const { P, mk } = parts();
    mk('sconce', [0, 0, 0], (v) => { v.box(-1, 2, 0, 1, 6, 1, 0x3a3a42); v.box(-1, 3, 1, 1, 4, 3, 0x3a3a42); v.box(-2, 4, 2, 2, 5, 5, 0x4a4a54); v.box(-1, 5, 2, 1, 6, 3, 0x2a2a30); v.box(-1, 5, 4, 1, 6, 5, 0x2a2a30); });
    mk('flame', [0, 5, 3.5], (v) => { v.box(-1, 5, 3, 1, 8, 4, E(0xff8a2a), 0.1); v.box(0, 8, 3, 1, 10, 4, E(0xffd34a)); v.set(0, 5, 3, E(0xffffff)); });
    return { vs: 1 / 10, h: 0.9, r: 0.1, parts: P };
  };
  G.MODELS.brazier = () => {
    const { P, mk } = parts();
    mk('bowl', [0, 0, 0], (v) => {
      for (const [x, z] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) v.box(x, 0, z, x + 1, 5, z + 1, 0x3a3a42);
      v.box(-5, 5, -5, 5, 6, 5, 0x4a4a54); v.box(-6, 6, -6, 6, 8, 6, 0x5a5a66);
      for (let x = -5; x < 5; x++) for (let z = -5; z < 5; z++) v.del(x, 7, z);
      v.box(-5, 6, -5, 5, 7, 5, 0x2a1a14); v.box(-4, 7, -4, 4, 8, 4, G.E(0xd8401a)); v.box(-2, 7, -2, 2, 8, 2, G.E(0xff9a2a));
    });
    mk('flame', [0, 8, 0], (v) => {
      for (const [x, z, h] of [[0, 0, 7], [-2, -1, 5], [1, 1, 5], [1, -2, 4], [-1, 2, 4], [-3, 1, 3], [2, -1, 3], [-2, -3, 3], [3, 2, 3]]) {
        v.box(x, 8, z, x + 1, 8 + h, z + 1, G.E(0xff7a1a), 0.12); v.box(x, 8 + Math.floor(h * 0.6), z, x + 1, 8 + h, z + 1, G.E(0xffb030)); if (h >= 4) v.set(x, 8 + h, z, G.E(0xffe27a)); if (h >= 7) v.set(x, 9 + h, z, G.E(0xffffff));
      }
    });
    return { vs: 1 / 9, h: 1.6, r: 0.55, parts: P };
  };
  G.MODELS.disc = () => { const { P, mk } = parts(); mk('main', [0, 0, 0], (v) => { for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= 17) v.set(x, 0, z, 0x000000); }, null, 0); return { vs: 0.1, h: 0.05, r: 0.4, parts: P, noBottom: true }; };

  // ---------- compilación a GPU con caché ----------
  const cache = new Map();
  G.getModel = (gl, key) => {
    if (cache.has(key)) return cache.get(key);
    const [kind, a, b, c] = key.split(':');
    let def;
    if (kind === 'hero') def = G.MODELS.hero(+a, +b, +c);
    else if (kind === 'enemy') def = G.MODELS.enemy(+a, b === '1');
    else if (kind === 'npc') def = G.MODELS.npc(a);
    else if (kind === 'item') def = G.MODELS.item(a, b || '');
    else if (kind === 'proj') def = G.MODELS.proj(a);
    else def = G.MODELS[kind]();
    const out = { key, vs: def.vs, h: def.h, r: def.r, fly: def.fly || 0, alpha: def.alpha || 1, scale: def.scale || 1, glow: def.glow || null, parts: [] };
    for (const p of def.parts) {
      const mb = G.meshVox(p.vox, def.vs, 0, 0, 0, !def.noBottom);
      out.parts.push({ name: p.name, parent: p.parent, pivot: [p.pivot[0] * def.vs, p.pivot[1] * def.vs, p.pivot[2] * def.vs], mesh: G.gpuMesh(gl, mb) });
    }
    cache.set(key, out);
    return out;
  };
})(window.G);
