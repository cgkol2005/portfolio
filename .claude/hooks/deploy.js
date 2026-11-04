// Χειροκίνητο deploy στο Cloudflare Pages:  echo {} | node .claude/hooks/deploy.js
// Ανεβάζει ό,τι υπάρχει στο τελευταίο commit (HEAD), όχι αλλαγές που δεν έχουν γίνει commit:
//   - τα αρχεία της σελίδας στη ρίζα (html, css, js, εικόνες) — όχι CLAUDE.md, .claude/, package.json κ.λπ.
//   - τη συνάρτηση του server (functions/, π.χ. /api/chat), που το wrangler τη χτίζει μαζί με το @anthropic-ai/sdk.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT = 'portfolio-gkolfos';
const SITE_FILE = /^[^/]+\.(html|css|js|jpe?g|png|svg|ico|webp|gif)$/i;   // μόνο αρχεία στη ρίζα

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const say = msg => process.stdout.write(JSON.stringify({ systemMessage: msg }));
const git = args => spawnSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });

const ls = git(['ls-tree', '-r', '--name-only', 'HEAD']);
if (ls.status !== 0) { say('Cloudflare deploy: δεν βρέθηκε HEAD στο git.'); process.exit(0); }
const all = ls.stdout.toString().split('\n').filter(Boolean);
const siteFiles = all.filter(f => SITE_FILE.test(f));
const functionFiles = all.filter(f => f.startsWith('functions/'));
if (!siteFiles.includes('index.html')) { say('Cloudflare deploy: δεν υπάρχει index.html στο HEAD, ακυρώθηκε.'); process.exit(0); }

// Οι functions χρειάζονται το node_modules (για το @anthropic-ai/sdk)
if (functionFiles.length && !fs.existsSync(path.join(root, 'node_modules'))) {
  const ci = spawnSync('npm ci', { cwd: root, shell: true, encoding: 'utf8' });
  if (ci.status !== 0) { say('Cloudflare deploy: το npm ci απέτυχε:\n' + (ci.stderr || '').trim().slice(-500)); process.exit(0); }
}

// Προσωρινός φάκελος ΜΕΣΑ στο project (.wrangler/ είναι στο .gitignore), ώστε το
// functions/api/chat.js να βρίσκει το node_modules της ρίζας όταν το χτίζει το wrangler.
const work = fs.mkdtempSync(path.join(root, '.wrangler', 'deploy-'));
const writeFromHead = (file, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, git(['show', `HEAD:${file}`]).stdout);
};
try {
  for (const f of siteFiles) writeFromHead(f, path.join(work, 'public', f));
  for (const f of functionFiles) writeFromHead(f, path.join(work, f));

  const cmd = `npx --yes wrangler pages deploy public --project-name ${PROJECT} --branch main --commit-dirty=true`;
  const r = spawnSync(cmd, { cwd: work, shell: true, encoding: 'utf8', timeout: 170000 });

  const text = (r.stdout || '') + (r.stderr || '');
  if (r.status === 0) {
    const url = (text.match(/https:\/\/\S+\.pages\.dev/) || [])[0];
    const fn = /Compiled Worker successfully|Uploading Functions bundle/i.test(text) ? ' + functions' : '';
    say(`Cloudflare deploy ολοκληρώθηκε (${siteFiles.length} αρχεία${fn}). Live: https://${PROJECT}.pages.dev` +
      (url ? ` · αυτό το deploy: ${url}` : ''));
  } else {
    say('Cloudflare deploy απέτυχε:\n' + text.trim().split('\n').slice(-10).join('\n'));
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
