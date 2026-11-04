// PostToolUse hook (Write|Edit) — και χειροκίνητα: node .claude/hooks/check-contrast.js index.html
// Ελέγχει ότι κάθε συνδυασμός κειμένου/φόντου έχει αντίθεση >= 4.5:1 (WCAG AA) σε ανοιχτό ΚΑΙ σκούρο θέμα,
// ότι τα δύο σκούρα blocks είναι ίδια, και ότι το CSS δεν έχει σκληροκωδικοποιημένα χρώματα κειμένου.
const fs = require('fs');
const path = require('path');

let file = process.argv[2];
if (!file) {
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    file = (input.tool_input && input.tool_input.file_path) || (input.tool_response && input.tool_response.filePath);
  } catch (e) { process.exit(0); }
}
if (!file || path.basename(file) !== 'index.html') process.exit(0);

let html;
try { html = fs.readFileSync(file, 'utf8'); } catch (e) { process.exit(0); }

// Συνδυασμοί [χρώμα κειμένου, φόντο, πού χρησιμοποιείται]
const PAIRS = [
  ['text', 'surface', 'κείμενο σε κάρτα'],
  ['text', 'bg', 'κείμενο σε φόντο σελίδας / input'],
  ['muted', 'surface', 'muted σε κάρτα (nav, λίστες)'],
  ['muted', 'bg', 'muted σε φόντο (footer, placeholder)'],
  ['accent', 'surface', 'accent σε κάρτα (links, τίτλοι)'],
  ['accent', 'accent-soft', 'accent σε accent-soft (tags, hover)'],
  ['on-accent', 'accent', 'κείμενο πάνω σε accent (κουμπιά)'],
  ['success', 'surface', 'μήνυμα επιτυχίας'],
  ['error', 'surface', 'μήνυμα σφάλματος'],
];
const MIN = 4.5;

const block = sel => {
  const i = html.indexOf(sel);
  if (i < 0) return null;
  const body = html.slice(html.indexOf('{', i) + 1, html.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2].toLowerCase()]));
};
const themes = {
  'ανοιχτό': block(':root {'),
  'σκούρο (σύστημα)': block(':root:not([data-theme="light"])'),
  'σκούρο (κουμπί)': block(':root[data-theme="dark"]'),
};

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const problems = [];
for (const [name, vars] of Object.entries(themes)) {
  if (!vars) { problems.push(`Δεν βρέθηκε το block χρωμάτων για το θέμα «${name}».`); continue; }
  for (const [fg, bg, where] of PAIRS) {
    if (!vars[fg] || !vars[bg]) { problems.push(`[${name}] λείπει η μεταβλητή --${vars[fg] ? bg : fg}.`); continue; }
    const r = ratio(vars[fg], vars[bg]);
    if (r < MIN) problems.push(`[${name}] --${fg} (${vars[fg]}) σε --${bg} (${vars[bg]}): ${r.toFixed(2)}:1 < ${MIN}:1 — ${where}`);
  }
}

const [, d1, d2] = Object.values(themes);
if (d1 && d2 && JSON.stringify(d1) !== JSON.stringify(d2)) {
  problems.push('Τα δύο σκούρα blocks (@media και [data-theme="dark"]) δεν έχουν ίδια χρώματα — πρέπει να ενημερώνονται μαζί.');
}

// Σκληροκωδικοποιημένα χρώματα κειμένου εκτός των :root blocks
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
for (const m of css.matchAll(/(^|[;{\s])color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[^;]*|white|black)/g)) {
  problems.push(`Σκληροκωδικοποιημένο χρώμα κειμένου «color: ${m[2]}» στο CSS — χρησιμοποίησε μεταβλητή (π.χ. var(--on-accent)) ώστε να ελέγχεται και στα δύο θέματα.`);
}

if (problems.length) {
  const reason = 'Έλεγχος αντίθεσης χρωμάτων απέτυχε:\n- ' + problems.join('\n- ');
  if (process.argv[2]) { console.log(reason); process.exit(1); }
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
} else if (process.argv[2]) {
  console.log('Αντίθεση OK: όλοι οι συνδυασμοί >= 4.5:1 σε ανοιχτό και σκούρο θέμα.');
}
