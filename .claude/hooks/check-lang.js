// PostToolUse hook (Write|Edit): ελέγχει ότι το index.html και το chat.js έχουν κάθε κείμενο και στις δύο γλώσσες.
const fs = require('fs');
const path = require('path');

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { process.exit(0); }

const file = (input.tool_input && input.tool_input.file_path) || (input.tool_response && input.tool_response.filePath);
if (!file || !['index.html', 'chat.js'].includes(path.basename(file))) process.exit(0);

let html;
try { html = fs.readFileSync(file, 'utf8'); } catch (e) { process.exit(0); }

const problems = [];

// 1. Ίδιος αριθμός lang="el" και lang="en" (χωρίς το <html lang="...">) — μόνο για HTML
if (file.endsWith('.html')) {
  const body = html.replace(/<html[^>]*>/i, '');
  const el = (body.match(/\blang="el"/g) || []).length;
  const en = (body.match(/\blang="en"/g) || []).length;
  if (el !== en) {
    problems.push(`Βρέθηκαν ${el} στοιχεία lang="el" και ${en} lang="en". Κάποιο κείμενο λείπει από τη μία γλώσσα.`);
  }
}

// 2. Στα JS objects, τα blocks el: {...} και en: {...} πρέπει να έχουν τα ίδια κλειδιά (και με εισαγωγικά, π.χ. 'chat-input')
const keysOf = block => [...block.matchAll(/^\s*['"]?([\w$-]+)['"]?\s*:/gm)].map(m => m[1]).sort();
const blocks = [...html.matchAll(/\b(el|en)\s*:\s*\{([^{}]*)\}/g)];
for (let i = 0; i + 1 < blocks.length; i++) {
  const [a, b] = [blocks[i], blocks[i + 1]];
  if (a[1] !== 'el' || b[1] !== 'en') continue;
  const ka = keysOf(a[2]);
  const kb = keysOf(b[2]);
  const onlyEl = ka.filter(k => !kb.includes(k));
  const onlyEn = kb.filter(k => !ka.includes(k));
  if (onlyEl.length || onlyEn.length) {
    const line = html.slice(0, a.index).split('\n').length;
    problems.push(`Στο object της γραμμής ${line}: μόνο στο el: [${onlyEl.join(', ')}], μόνο στο en: [${onlyEn.join(', ')}].`);
  }
  i++;
}

if (problems.length) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'Έλεγχος EL/EN στο ' + path.basename(file) + ' απέτυχε:\n- ' + problems.join('\n- ') +
      '\nΚάθε κείμενο πρέπει να υπάρχει και στα ελληνικά και στα αγγλικά.'
  }));
}
