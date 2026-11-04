// Stop hook: υπενθύμιση αν υπάρχουν αλλαγές χωρίς commit ή commits χωρίς push.
const { spawnSync } = require('child_process');

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync('git', ['status', '--porcelain', '-b'], { cwd: root, encoding: 'utf8' });
if (r.status !== 0) process.exit(0);

const lines = r.stdout.split('\n').filter(Boolean);
const branch = lines.shift() || '';
const changed = lines.map(l => l.slice(3));
const ahead = (branch.match(/ahead (\d+)/) || [])[1];

const notes = [];
if (changed.length) {
  const shown = changed.slice(0, 5).join(', ') + (changed.length > 5 ? ` (+${changed.length - 5})` : '');
  notes.push(`${changed.length} αρχεία χωρίς commit: ${shown}`);
}
if (ahead) notes.push(`${ahead} commit(s) χωρίς push`);

if (notes.length) {
  process.stdout.write(JSON.stringify({ systemMessage: 'Git: ' + notes.join(' · ') }));
}
