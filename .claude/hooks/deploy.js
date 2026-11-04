// PostToolUse hook (git push): ανεβάζει στο Cloudflare Pages ό,τι έγινε push (το HEAD),
// αλλά μόνο τα αρχεία της σελίδας — όχι CLAUDE.md, .claude/ κ.λπ.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT = 'portfolio-gkolfos';
const SITE_FILE = /^[^/]+\.(html|jpe?g|png|svg|ico|webp|gif)$/i; // μόνο αρχεία στη ρίζα

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const say = msg => process.stdout.write(JSON.stringify({ systemMessage: msg }));

const git = args => spawnSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });

const ls = git(['ls-tree', '--name-only', 'HEAD']);
if (ls.status !== 0) { say('Cloudflare deploy: δεν βρέθηκε HEAD στο git.'); process.exit(0); }
const files = ls.stdout.toString().split('\n').filter(f => SITE_FILE.test(f));
if (!files.includes('index.html')) { say('Cloudflare deploy: δεν υπάρχει index.html στο HEAD, ακυρώθηκε.'); process.exit(0); }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-deploy-'));
try {
  for (const f of files) {
    const out = git(['show', `HEAD:${f}`]);
    fs.writeFileSync(path.join(dir, f), out.stdout);
  }

  const cmd = `npx --yes wrangler pages deploy "${dir}" --project-name ${PROJECT} --branch main --commit-dirty=true`;
  const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', timeout: 170000 });

  const text = (r.stdout || '') + (r.stderr || '');
  if (r.status === 0) {
    const url = (text.match(/https:\/\/\S+\.pages\.dev/) || [])[0];
    say(`Cloudflare deploy ολοκληρώθηκε (${files.length} αρχεία). Live: https://${PROJECT}.pages.dev` +
      (url ? ` · αυτό το deploy: ${url}` : ''));
  } else {
    say('Cloudflare deploy απέτυχε:\n' + text.trim().split('\n').slice(-8).join('\n'));
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
