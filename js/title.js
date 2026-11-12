'use strict';
// Escena del título / selección de clase: un pequeño diorama voxel (sala con escalera, antorchas y braseros)
// que se dibuja con el mismo motor que la partida. Se usa mientras no hay una partida en curso.
(function (G) {
  G.TITLE_THEME = { m: 3, ma: 11, s: 5, su: 8, sa: 3, sl: 6, p: 7, af: 11, ab: 1, lf: 12, lb: 4, dc: 7, d: 'x', ac: [11, 13] };
  G.titleMap = () => {
    const W = 25, H = 17, rows = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) {
        let c = '.';
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c = '#';
        if (y === 0 && (x === 5 || x === 12 || x === 19)) c = 't';
        if ((x === 0 || x === W - 1) && (y === 5 || y === 11)) c = 't';
        if ((x === 4 || x === W - 5) && (y === 4 || y === H - 5)) c = 'p';
        if (y === 1 && x >= 11 && x <= 13) c = '>';
        if (y === 2 && x >= 11 && x <= 13) c = '>';
        if ((x === W - 7 || x === W - 8) && (y === H - 5 || y === H - 6)) c = 'l';
        if ((x === 6 || x === 7) && (y === H - 5 || y === H - 6)) c = 'w';
        r += c;
      }
      rows.push(r);
    }
    const bio = rows.map((r) => '0'.repeat(r.length));
    return { w: W, h: H, rows, bio, temas: [G.TITLE_THEME, G.TITLE_THEME, G.TITLE_THEME], piso: 1, nombre: 'Título' };
  };
  // Rellena un World de título con héroe y braseros
  G.setupTitle = (world, cls) => {
    world.setMap(G.titleMap());
    const gl = world.gl;
    world.ents.clear();
    const mk = (id, key, x, y, kind = 'prop') => { const e = new G.Ent(kind, id); e.model = G.getModel(gl, key); e.key = key; e.x = x + 0.5; e.z = y + 0.5; e.tx = x; e.ty = y; e.scale = 1; return e; };
    for (const [x, y] of [[8, 4], [16, 4], [5, 10], [19, 10]]) { const b = mk('b' + x + y, 'brazier', x, y); world.ents.set(b.id, b); }
    const h = mk('p', `hero:${cls}:2:2`, 12, 8, 'hero'); h.cls = cls; h.scale = 1.35; world.hero = h; world.ents.set('p', h);
    const chest = mk('c1', 'item:C:', 17, 7, 'item'); chest.ch = 'C'; world.ents.set('c1', chest);
    const pot = mk('c2', 'item:H:', 9, 9, 'item'); pot.ch = 'H'; world.ents.set('c2', pot);
    const gold = mk('c3', 'item:$:', 14, 10, 'item'); gold.ch = '$'; world.ents.set('c3', gold);
    world.cam.x = 12.5; world.cam.z = 8.5; world.cam.init = false;
    world.torchEmit = 0; world.statics = [{ x: 12.5, y: 3.4, z: 11.5, r: 10, c: [0.34, 0.5, 0.95] }, { x: 9.5, y: 2.2, z: 7.5, r: 8, c: [1.25, 0.72, 0.36] }];
  };
})(window.G);
