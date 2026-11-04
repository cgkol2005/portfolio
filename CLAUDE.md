# Portfolio — Χρήστος Γκόλφος

Στατικό προσωπικό portfolio. Όλη η σελίδα είναι ένα αρχείο, το `index.html`, με inline CSS και JS. Δεν υπάρχει build, npm ή framework.

## Αρχεία
- `index.html`: όλη η σελίδα (ενότητες about, skills, projects, contact).
- `auth-logo.jpg`, `email.jpg`: εικόνες που χρησιμοποιεί η σελίδα.

## Δίγλωσσο περιεχόμενο (EL / EN)
- Κάθε κείμενο υπάρχει δύο φορές: `<span lang="el">…</span><span lang="en">…</span>` (ή `<p lang="…">`).
  Το CSS (`html[lang="el"] [lang="en"] { display: none; }` και το αντίστροφο) κρύβει τη γλώσσα που δεν είναι ενεργή.
- **Κάθε νέο ή αλλαγμένο κείμενο πρέπει να γραφτεί και στις δύο γλώσσες.**
- Ό,τι δεν είναι HTML (placeholders, μηνύματα σφάλματος της φόρμας, `<title>`) υπάρχει σε JS objects με κλειδιά `el` / `en` (`titles`, placeholders, `messages`).
- Η επιλεγμένη γλώσσα αποθηκεύεται στο `localStorage.lang`. Η προεπιλογή είναι `el`.

## Θέμα (light / dark)
- Τα χρώματα ορίζονται ως CSS μεταβλητές στο `:root`. Για το dark υπάρχουν σε `@media (prefers-color-scheme: dark)` και `:root[data-theme="dark"]`.
- Νέα χρώματα μπαίνουν ως μεταβλητές και στα δύο θέματα, όχι απευθείας σε τιμές.
- Η επιλογή θέματος αποθηκεύεται στο `localStorage.theme`.

## Δεξιότητες
- Οι δεξιότητες είναι tags: `<div class="tags"><span class="tag">…</span></div>` κάτω από `<h3>` για κάθε κατηγορία.

## Φόρμα επικοινωνίας
- Στέλνεται μέσω FormSubmit (`FORM_ENDPOINT = https://formsubmit.co/ajax/cgkol@csd.auth.gr`) με `fetch`.
- Πεδία: name, phone, email, reason, όλα υποχρεωτικά και ελεγμένα στη `validate()`. Υπάρχει επίσης honeypot `_honey` για bots.
- Αν αλλάξει κάποιο πεδίο, πρέπει να ενημερωθούν μαζί: το HTML, η `validate()`, η `clearErrors()`, τα placeholders και το JSON body του `fetch`.

## Git
- Remote: `https://github.com/cgkol2005/portfolio.git`, branch `main`.
- Τα commit messages γράφονται στα αγγλικά, σύντομα.
- Στο commit μπαίνουν μόνο τα αρχεία της συγκεκριμένης αλλαγής, όχι άσχετες αλλαγές που έτυχε να είναι staged.

## Deploy (Cloudflare Pages)
- Project: `portfolio-gkolfos`. Live: https://portfolio-gkolfos.pages.dev
- Το Cloudflare δεν συνδέεται με το GitHub. Όταν όμως κάνει push το Claude Code, το hook `.claude/hooks/deploy.js` κάνει αυτόματα deploy.
  Ανεβαίνουν **μόνο** τα αρχεία της σελίδας από το `HEAD` (html και εικόνες στη ρίζα), όχι τα `CLAUDE.md` και `.claude/`.
- Χειροκίνητο deploy, π.χ. μετά από push εκτός Claude Code:
  ```
  echo {} | node .claude/hooks/deploy.js
  ```
  **Όχι** `wrangler pages deploy .`, γιατί αυτό θα ανέβαζε δημόσια και τα `CLAUDE.md` και `.claude/`.
- Μετά το deploy, έλεγχος με `curl -s https://portfolio-gkolfos.pages.dev/` ότι η αλλαγή φαίνεται online.

## Skills
- `/portfolio-add [δεξιότητα|project] <περιγραφή>` (`.claude/skills/portfolio-add/SKILL.md`): προσθέτει δεξιότητα ή project σε EL και EN, και μετά κάνει commit, push και deploy.

## Hooks (`.claude/settings.json`)
- `check-lang.js`: μετά από αλλαγή στο `index.html`, ελέγχει ότι υπάρχει ίδιος αριθμός `lang="el"` και `lang="en"`, και ότι τα el/en blocks στο JS έχουν τα ίδια κλειδιά.
- `deploy.js`: μετά από `git push`, κάνει deploy στο Cloudflare Pages.
- `git-reminder.js`: στο τέλος κάθε απάντησης, εμφανίζει μήνυμα αν υπάρχουν αλλαγές χωρίς commit ή push.

## Έλεγχος αλλαγών
Δεν υπάρχουν tests. Άνοιγμα του `index.html` στον browser και έλεγχος σε EL και EN, σε light και dark, και σε πλάτος κινητού.
