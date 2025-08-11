// symbol.js
export const E = {
  // ===== Dividers =====
  dividerThin:    '\u2500',   // ─
  dividerThick:   '\u2501',   // ━
  dividerDouble:  '\u2550',   // ═
  dividerDot:     '\u00B7',   // ·
  dividerDash:    '-',        // -
  dividerWave:    '~',        // ~
  dividerEquals:  '=',        // =
  dividerStar:    '\u2605',   // ★
  dividerDiamond: '\u2666',   // ♦
  dividerBox:     '\u25A0',   // ■
  dividerFancy:   '\u2022',   // •
  dividerArrow:   '\u2796',   // ➖
  dividerApprox:  '\u2248',   // ≈

  // Default separator
  sep: '\u2500',              // ─

  // ===== Progress bar bricks =====
  barFull:  '\u2588',         // █
  barEmpty: '\u2591',         // ░

  // ===== Icons =====
  clock:       '\u23F0',                   // ⏰
  stopwatch:   '\u23F1',                   // ⏱
  pickaxe:     '\u26CF',                   // ⛏
  mined:       '\u26CF',                   // ⛏ (alias pickaxe)
  coin:        '\u{1FA99}',                 // 🪙
  wallet:      '\u{1F45B}',                 // 👛
  money:       '\u{1F4B0}',                 // 💰
  blueDiamond: '\u{1F537}',                 // 🔷
  robot:       '\u{1F916}',                 // 🤖
  personPc:    '\u{1F9D1}\u200D\u{1F4BB}',  // 🧑‍💻
  warn:        '\u26A0\uFE0F',              // ⚠️
  chart:       '\u{1F4C8}',                 // 📈
  progress:    '\u{1F4CA}',                 // 📊
  speed:       '\u23E9',                    // ⏩
  status:      '\u{1F3C1}',                 // 🏁

  // Klaim & status
  claim:     '\u{1F4B0}', // 💰
  check:     '\u2705',    // ✅
  cross:     '\u274C',    // ❌
  boom:      '\u{1F4A5}', // 💥
  link:      '\u{1F517}', // 🔗
  calendar:  '\u{1F4C5}', // 📅
  doc:       '\u{1F4DC}', // 📜
};

// (Opsional) helper bikin divider cepat
export function makeDivider(style = 'dividerThin', len = 28) {
  const ch = E[style] || E.dividerThin;
  return ch.repeat(len);
}
