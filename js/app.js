/* ═══════════════════════════════════════════
   Bracket Forge — Main Application Logic
   ═══════════════════════════════════════════ */

/* ── STATE ── */
let teams = [];
let mode = 'single';
let M = [];
let C = [];
let S = null;

/* ── CONSTANTS ── */
const MW = 200, MH = 72, CG = 80, RG = 16, PAD = 40;

/* ═══════════════════════════════════════════
   SETUP
   ═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('teamInput');
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = inp.value.trim();
      if (name && !teams.includes(name) && teams.length < 64) {
        teams.push(name);
        inp.value = '';
        renderTags();
      }
    }
  });
});

function removeTeam(i) { teams.splice(i, 1); renderTags(); }

function renderTags() {
  document.getElementById('teamTags').innerHTML = teams.map((t, i) =>
    `<div class="team-tag"><span class="seed">${i + 1}</span>${esc(t)}<button class="tag-x" onclick="removeTeam(${i})">✕</button></div>`
  ).join('');
  const n = teams.length;
  document.getElementById('teamCount').innerHTML = n < 3
    ? `Add at least <strong>${3 - n}</strong> more team${3 - n > 1 ? 's' : ''}`
    : `<strong>${n}</strong> teams ready`;
  document.getElementById('generateBtn').disabled = n < 3;
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
}

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function shuf(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = 0 | Math.random() * (i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }
function np2(n) { let p = 1; while (p < n) p *= 2; return p; }
function gm(id) { return M.find(m => m.id === id) || null; }
function mk(id, num, t1, t2, sec, rnd, idx) { return { id, num, team1: t1, team2: t2, winner: null, section: sec, round: rnd, index: idx }; }

function getRN(n, pfx = '') {
  const a = [];
  for (let i = 0; i < n; i++) {
    const r = n - i;
    if (r === 1) a.push(pfx ? pfx + ' Finals' : 'Finals');
    else if (r === 2) a.push(pfx ? pfx + ' Semis' : 'Semifinals');
    else if (r === 3) a.push(pfx ? pfx + ' Quarters' : 'Quarterfinals');
    else a.push((pfx ? pfx + ' ' : '') + `Round ${i + 1}`);
  }
  return a;
}

/* ═══════════════════════════════════════════
   GENERATE
   ═══════════════════════════════════════════ */
function generateBracket() {
  if (teams.length < 3) return;
  M = []; C = []; S = null; closeLB();
  const sh = shuf(teams);
  if (mode === 'single') buildSE(sh); else buildDE(sh);
  document.getElementById('setupPanel').style.display = 'none';
  document.getElementById('bracketArea').classList.add('visible');
  document.getElementById('bracketTitle').innerHTML = `Tournament <span>${mode === 'single' ? 'Single' : 'Double'} Elim · ${teams.length} Teams</span>`;
  render();
}

/* ═══════════════════════════════════════════
   SINGLE ELIMINATION
   ═══════════════════════════════════════════ */
function buildSE(sh) {
  const sz = np2(sh.length), nr = Math.log2(sz);
  const slots = []; for (let i = 0; i < sz; i++) slots.push(i < sh.length ? sh[i] : null);
  let mn = 1; const rounds = [];

  const r1real = [];
  for (let i = 0; i < sz; i += 2) {
    const t1 = slots[i], t2 = slots[i + 1];
    if (t1 && t2) { const m = mk(`se-0-${r1real.length}`, mn++, t1, t2, 'W', 0, r1real.length); r1real.push(m); M.push(m); }
  }
  rounds.push(r1real);

  const r1map = []; let realIdx = 0;
  for (let i = 0; i < sz; i += 2) {
    const t1 = slots[i], t2 = slots[i + 1];
    if (t1 && t2) r1map.push({ type: 'match', match: r1real[realIdx++] });
    else r1map.push({ type: 'bye', team: t1 || t2 });
  }

  let prevMap = r1map;
  for (let r = 1; r < nr; r++) {
    const rnd = [], nextMap = [];
    for (let i = 0; i < prevMap.length; i += 2) {
      const a = prevMap[i], b = prevMap[i + 1];
      const t1 = a.type === 'bye' ? a.team : (a.match ? a.match.winner : null);
      const t2 = b ? (b.type === 'bye' ? b.team : (b.match ? b.match.winner : null)) : null;
      if (a.type === 'bye' && b && b.type === 'bye') {
        const m = mk(`se-${r}-${rnd.length}`, mn++, t1, t2, 'W', r, rnd.length);
        rnd.push(m); M.push(m); nextMap.push({ type: 'match', match: m }); continue;
      }
      const m = mk(`se-${r}-${rnd.length}`, mn++, t1, t2, 'W', r, rnd.length);
      m._s0src = a.type === 'match' ? a.match.id : null;
      m._s1src = b ? (b.type === 'match' ? b.match.id : null) : null;
      if (a.type === 'match') C.push({ from: a.match.id, to: m.id, slot: 0, kind: 'win' });
      if (b && b.type === 'match') C.push({ from: b.match.id, to: m.id, slot: 1, kind: 'win' });
      rnd.push(m); M.push(m); nextMap.push({ type: 'match', match: m });
    }
    rounds.push(rnd); prevMap = nextMap;
  }
  S = { type: 'single', rounds, nr, r1map };
  layoutRounds(rounds, nr);
}

function propSE() {
  const { rounds, nr, r1map } = S;
  let prevMap = r1map;
  for (let r = 1; r < nr; r++) {
    const rnd = rounds[r]; const nextMap = []; let ri = 0;
    for (let i = 0; i < prevMap.length; i += 2) {
      const a = prevMap[i], b = prevMap[i + 1]; const m = rnd[ri++];
      m.team1 = a.type === 'bye' ? a.team : (a.match ? a.match.winner : null);
      m.team2 = b ? (b.type === 'bye' ? b.team : (b.match ? b.match.winner : null)) : null;
      if (m.winner && m.winner !== m.team1 && m.winner !== m.team2) m.winner = null;
      nextMap.push({ type: 'match', match: m });
    }
    prevMap = nextMap;
  }
}

/* ═══════════════════════════════════════════
   DOUBLE ELIMINATION
   ═══════════════════════════════════════════ */
function buildDE(sh) {
  const sz = np2(sh.length), wr = Math.log2(sz);
  const slots = []; for (let i = 0; i < sz; i++) slots.push(i < sh.length ? sh[i] : null);
  let mn = 1;

  /* Winners */
  const wR1real = [], wR1map = [];
  for (let i = 0; i < sz; i += 2) {
    const t1 = slots[i], t2 = slots[i + 1];
    if (t1 && t2) {
      const m = mk(`w-0-${wR1real.length}`, mn++, t1, t2, 'W', 0, wR1real.length);
      m.loser = null; wR1real.push(m); M.push(m);
      wR1map.push({ type: 'match', match: m });
    } else { wR1map.push({ type: 'bye', team: t1 || t2 }); }
  }
  const wB = [wR1real], wMaps = [wR1map];

  for (let r = 1; r < wr; r++) {
    const prevMap = wMaps[r - 1]; const rnd = [], nextMap = [];
    for (let i = 0; i < prevMap.length; i += 2) {
      const a = prevMap[i], b = prevMap[i + 1];
      const t1 = a.type === 'bye' ? a.team : (a.match ? a.match.winner : null);
      const t2 = b ? (b.type === 'bye' ? b.team : (b.match ? b.match.winner : null)) : null;
      const m = mk(`w-${r}-${rnd.length}`, mn++, t1, t2, 'W', r, rnd.length);
      m.loser = null;
      if (a.type === 'match') C.push({ from: a.match.id, to: m.id, slot: 0, kind: 'win' });
      if (b && b.type === 'match') C.push({ from: b.match.id, to: m.id, slot: 1, kind: 'win' });
      rnd.push(m); M.push(m); nextMap.push({ type: 'match', match: m });
    }
    wB.push(rnd); wMaps.push(nextMap);
  }

  /* Losers */
  const wReal = []; for (let r = 0; r < wr; r++) wReal.push(wB[r]);
  const lB = []; let lri = 0;

  if (wReal[0].length >= 2) {
    const rnd = [];
    for (let i = 0; i < wReal[0].length; i += 2) {
      const s0 = wReal[0][i], s1 = wReal[0][i + 1] || null;
      const m = mk(`l-${lri}-${rnd.length}`, mn++, null, null, 'L', lri, rnd.length);
      m.loser = null; m._feeds = [s0.id, s1 ? s1.id : null]; m._ft = 'lp';
      rnd.push(m); M.push(m);
    }
    lB.push(rnd); lri++;
  }

  let wdi = 1;
  if (wReal[0].length === 1 && wdi < wr) {
    const drops = wReal[wdi]; wdi++;
    const rnd = []; const cnt = Math.max(1, drops.length);
    for (let i = 0; i < cnt; i++) {
      const m = mk(`l-${lri}-${i}`, mn++, null, null, 'L', lri, i);
      m.loser = null; m._feeds = [wReal[0][0].id, drops[i] ? drops[i].id : null]; m._ft = 'md';
      rnd.push(m); M.push(m);
    }
    lB.push(rnd); lri++;
  }

  for (let safe = 0; safe < 20; safe++) {
    const last = lB.length ? lB[lB.length - 1] : null; if (!last) break;
    if (wdi < wr) {
      const drops = wReal[wdi]; wdi++;
      const rnd = []; const cnt = Math.max(last.length, drops.length);
      for (let i = 0; i < cnt; i++) {
        const m = mk(`l-${lri}-${i}`, mn++, null, null, 'L', lri, i);
        m.loser = null; m._feeds = [last[i] ? last[i].id : null, drops[i] ? drops[i].id : null]; m._ft = 'dr';
        rnd.push(m); M.push(m);
      }
      lB.push(rnd); lri++;
    }
    const cur = lB[lB.length - 1];
    if (cur.length >= 2) {
      const rnd = [];
      for (let i = 0; i < cur.length; i += 2) {
        if (!cur[i + 1]) break;
        const m = mk(`l-${lri}-${rnd.length}`, mn++, null, null, 'L', lri, rnd.length);
        m.loser = null; m._feeds = [cur[i].id, cur[i + 1].id]; m._ft = 'co';
        rnd.push(m); M.push(m);
      }
      if (rnd.length) { lB.push(rnd); lri++; }
    }
    const fin = lB[lB.length - 1];
    if (fin.length <= 1 && wdi >= wr) break;
  }

  /* Grand Finals */
  const wFin = wB[wr - 1][0];
  const lFin = lB.length ? lB[lB.length - 1][0] : null;
  const gf = mk('gf', mn++, null, null, 'GF', 'gf', 0);
  gf.loser = null; M.push(gf);
  C.push({ from: wFin.id, to: gf.id, slot: 0, kind: 'win' });
  if (lFin) C.push({ from: lFin.id, to: gf.id, slot: 1, kind: 'win' });

  for (const rnd of lB) {
    for (const m of rnd) {
      if (!m._feeds) continue;
      m._feeds.forEach((fid, si) => { if (fid) C.push({ from: fid, to: m.id, slot: si, kind: 'losers', ft: m._ft, si }); });
    }
  }
  S = { type: 'double', wB, lB, wr, gf, wMaps };
  layoutDE(wB, lB, gf, wr);
}

function propDE() {
  const { wB, lB, wr, gf, wMaps } = S;
  for (let r = 1; r < wr; r++) {
    const prevMap = wMaps[r - 1], rnd = wB[r]; let ri = 0;
    for (let i = 0; i < prevMap.length; i += 2) {
      const a = prevMap[i], b = prevMap[i + 1]; const m = rnd[ri++];
      m.team1 = a.type === 'bye' ? a.team : (a.match ? a.match.winner : null);
      m.team2 = b ? (b.type === 'bye' ? b.team : (b.match ? b.match.winner : null)) : null;
      if (m.winner && m.winner !== m.team1 && m.winner !== m.team2) { m.winner = null; m.loser = null; }
      if (m.winner) m.loser = m.winner === m.team1 ? m.team2 : m.team1;
    }
  }
  for (const m of wB[0]) { if (m.winner) m.loser = m.winner === m.team1 ? m.team2 : m.team1; }

  for (const rnd of lB) {
    for (const m of rnd) {
      if (!m._feeds) continue;
      const s0 = m._feeds[0] ? gm(m._feeds[0]) : null, s1 = m._feeds[1] ? gm(m._feeds[1]) : null;
      if (m._ft === 'lp' || m._ft === 'md') { m.team1 = s0 ? s0.loser || null : null; m.team2 = s1 ? s1.loser || null : null; }
      else if (m._ft === 'dr') { m.team1 = s0 ? s0.winner || null : null; m.team2 = s1 ? s1.loser || null : null; }
      else if (m._ft === 'co') { m.team1 = s0 ? s0.winner || null : null; m.team2 = s1 ? s1.winner || null : null; }
      if (m.winner && m.winner !== m.team1 && m.winner !== m.team2) { m.winner = null; m.loser = null; }
      if (m.winner) m.loser = m.winner === m.team1 ? m.team2 : m.team1;
    }
  }
  const wFin = wB[wr - 1][0], lFin = lB.length ? lB[lB.length - 1][0] : null;
  gf.team1 = wFin ? wFin.winner : null; gf.team2 = lFin ? lFin.winner : null;
  if (gf.winner && gf.winner !== gf.team1 && gf.winner !== gf.team2) { gf.winner = null; gf.loser = null; }
  if (gf.winner) gf.loser = gf.winner === gf.team1 ? gf.team2 : gf.team1;
}

/* ═══════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════ */
function layoutRounds(rounds, nr) {
  const maxH = rounds[0].length * (MH + RG) - RG;
  for (let r = 0; r < nr; r++) {
    const rnd = rounds[r], th = rnd.length * (MH + RG) - RG, oy = Math.max(0, (maxH - th) / 2);
    for (let i = 0; i < rnd.length; i++) { rnd[i].x = PAD + r * (MW + CG); rnd[i].y = PAD + 30 + oy + i * (MH + RG); }
  }
}

function layoutDE(wB, lB, gf, wr) {
  const wMaxH = Math.max(wB[0].length * (MH + RG) - RG, MH);
  for (let r = 0; r < wr; r++) {
    const rnd = wB[r], th = rnd.length * (MH + RG) - RG, oy = Math.max(0, (wMaxH - th) / 2);
    for (let i = 0; i < rnd.length; i++) { rnd[i].x = PAD + r * (MW + CG); rnd[i].y = PAD + 30 + oy + i * (MH + RG); }
  }
  const wBot = PAD + 30 + wMaxH + 60;
  const lMaxH = lB.length ? (lB[0].length * (MH + RG) - RG) : MH;
  for (let lr = 0; lr < lB.length; lr++) {
    const rnd = lB[lr], th = rnd.length * (MH + RG) - RG, oy = Math.max(0, (lMaxH - th) / 2);
    for (let i = 0; i < rnd.length; i++) { rnd[i].x = PAD + lr * (MW + CG); rnd[i].y = wBot + 30 + oy + i * (MH + RG); }
  }
  const maxWX = wB[wr - 1][0].x, maxLX = lB.length ? lB[lB.length - 1][0].x : 0;
  gf.x = Math.max(maxWX, maxLX) + MW + CG; gf.y = wBot / 2;
}

/* ═══════════════════════════════════════════
   PICK / UNDO
   ═══════════════════════════════════════════ */
function pickWinner(mid, si) {
  closeLB(); const m = gm(mid);
  if (!m || m.winner || !m.team1 || !m.team2) return;
  m.winner = si === 0 ? m.team1 : m.team2;
  if (m.loser !== undefined) m.loser = si === 0 ? m.team2 : m.team1;
  if (mode === 'single') propSE(); else propDE();
  render(); checkWin();
}

function undoWinner(mid) {
  closeLB(); const m = gm(mid); if (!m || !m.winner) return;
  m.winner = null; if (m.loser !== undefined) m.loser = null;
  if (mode === 'single') {
    M.filter(x => x.section === 'W' && x.round > m.round).forEach(x => { x.winner = null; });
    propSE();
  } else {
    if (m.section === 'W') {
      M.filter(x => x.section === 'W' && x.round > m.round).forEach(x => { x.winner = null; x.loser = null; });
      M.filter(x => x.section === 'L').forEach(x => { x.winner = null; x.loser = null; });
      S.gf.winner = null; S.gf.loser = null;
    } else if (m.section === 'L') {
      M.filter(x => x.section === 'L' && x.round > m.round).forEach(x => { x.winner = null; x.loser = null; });
      S.gf.winner = null; S.gf.loser = null;
    } else if (mid === 'gf') { S.gf.winner = null; S.gf.loser = null; }
    propDE();
  }
  render();
}

function checkWin() {
  if (mode === 'single') { const fin = S.rounds[S.nr - 1][0]; if (fin.winner) showLB(fin.winner); }
  else { if (S.gf.winner) showLB(S.gf.winner); }
}

/* ═══════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════ */
function render() {
  const cv = document.getElementById('bracketCanvas');
  const vis = M.filter(m => m.x !== undefined);
  let maxX = 0, maxY = 0;
  vis.forEach(m => { maxX = Math.max(maxX, m.x + MW + 60); maxY = Math.max(maxY, m.y + MH + 40); });
  cv.style.width = maxX + 'px'; cv.style.height = maxY + 'px';
  let h = '';

  h += `<svg class="bracket-svg" width="${maxX}" height="${maxY}">`;
  for (const c of C) {
    const fm = gm(c.from), tm = gm(c.to);
    if (!fm || !tm || fm.x === undefined || tm.x === undefined) continue;
    const fx = fm.x + MW, fy = fm.y + MH / 2, tx = tm.x, ty = c.slot === 0 ? tm.y + MH * .25 : tm.y + MH * .75;
    const mx = (fx + tx) / 2;
    if (c.kind === 'losers') {
      if (fm.section === 'W') {
        if (fm.loser) h += `<path d="M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}" fill="none" stroke="var(--lose)" stroke-width="1.5" opacity=".2" stroke-dasharray="4,4"/>`;
      } else {
        const a = !!fm.winner;
        h += `<path d="M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}" fill="none" stroke="${a ? 'var(--line-win)' : 'var(--line)'}" stroke-width="${a ? 2 : 1.5}" opacity="${a ? .7 : .25}"/>`;
      }
    } else {
      const a = !!fm.winner;
      h += `<path d="M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}" fill="none" stroke="${a ? 'var(--line-win)' : 'var(--line)'}" stroke-width="${a ? 2.5 : 1.5}" opacity="${a ? .8 : .25}"/>`;
    }
  }
  h += '</svg>';

  if (mode === 'double') {
    h += `<div class="section-tag w" style="top:${PAD + 4}px;left:${PAD}px">WINNERS BRACKET</div>`;
    const wMaxH = S.wB[0].length * (MH + RG) - RG;
    h += `<div class="section-tag l" style="top:${PAD + 30 + wMaxH + 44}px;left:${PAD}px">LOSERS BRACKET</div>`;
    h += `<div class="section-tag f" style="top:${S.gf.y - 22}px;left:${S.gf.x}px">GRAND FINALS</div>`;
  }

  for (const m of vis) h += renderMB(m);
  cv.innerHTML = h;
}

function renderMB(m) {
  const t1 = m.team1, t2 = m.team2, hasW = m.winner !== null, canClick = !hasW && t1 && t2;
  let cls = 'match-box'; if (hasW) cls += ' decided'; if (m.section === 'GF') cls += ' gf-box';
  let h = `<div class="${cls}" style="left:${m.x}px;top:${m.y}px" data-id="${m.id}">`;
  h += `<div class="match-num">${m.num}</div><div class="match-inner">`;
  h += slotHTML(m, t1, 0, hasW, canClick);
  h += slotHTML(m, t2, 1, hasW, canClick);
  h += `</div>`;
  if (hasW) h += `<button class="undo-btn" onclick="event.stopPropagation();undoWinner('${m.id}')" title="Undo"><svg viewBox="0 0 24 24"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><path d="M3 10l4-4"/><path d="M3 10l4 4"/></svg></button>`;
  h += `</div>`;
  return h;
}

function slotHTML(m, team, si, hasW, canClick) {
  const isW = hasW && m.winner === team, isL = hasW && team && m.winner !== team;
  let cls = 'match-slot';
  if (!team) cls += ' empty no-click';
  else if (isW) cls += ' winner no-click';
  else if (isL) cls += ' loser no-click';
  else if (!canClick) { cls += ' no-click'; if (team) cls += ' waiting'; }
  const click = canClick ? `onclick="pickWinner('${m.id}',${si})"` : '';
  return `<div class="${cls}" ${click}><span class="team-name">${team ? esc(team) : 'TBD'}</span></div>`;
}

/* ═══════════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════════ */
function showLB(champ) {
  document.getElementById('lbSubtitle').textContent = `${mode === 'single' ? 'Single' : 'Double'} Elimination · ${teams.length} Teams`;
  const elim = [];
  const decided = M.filter(m => m.winner && m.section !== 'GF').sort((a, b) => a.num - b.num);
  for (const m of decided) {
    const loser = m.winner === m.team1 ? m.team2 : m.team1;
    if (loser && !elim.includes(loser)) elim.push(loser);
  }
  if (mode === 'double' && S.gf.winner) {
    const gl = S.gf.winner === S.gf.team1 ? S.gf.team2 : S.gf.team1;
    if (gl && !elim.includes(gl)) elim.push(gl);
  }
  const placed = [champ, ...[...elim].reverse()];
  teams.forEach(t => { if (!placed.includes(t)) placed.push(t); });

  let h = '';
  placed.forEach((p, i) => {
    const r = i + 1;
    const rc = r === 1 ? 'r1' : r === 2 ? 'r2' : r === 3 ? 'r3' : 'rn';
    const nc = r === 1 ? 'n1' : r === 2 ? 'n2' : r === 3 ? 'n3' : '';
    const badge = r === 1 ? '<span class="lb-badge b1">Champion</span>' : r === 2 ? '<span class="lb-badge b2">Runner-up</span>' : r === 3 ? '<span class="lb-badge b3">3rd Place</span>' : '';
    const crown = r === 1 ? '<span class="lb-crown">👑</span>' : '';
    h += `<div class="lb-row"><div class="lb-rank ${rc}">${r}</div><div class="lb-name ${nc}">${crown}${esc(p)}</div>${badge}</div>`;
  });
  document.getElementById('lbRows').innerHTML = h;
  document.getElementById('lbOverlay').classList.add('visible');
}

function closeLB() { document.getElementById('lbOverlay').classList.remove('visible'); }

function resetBracket() {
  M = []; C = []; S = null; closeLB();
  document.getElementById('bracketArea').classList.remove('visible');
  document.getElementById('setupPanel').style.display = 'block';
}
