# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portfolio — Χρήστος Γκόλφος

Στατικό προσωπικό portfolio. Όλη η σελίδα είναι ένα αρχείο, το `index.html`, με inline CSS και JS. Δεν υπάρχει build, npm ή framework.

## Εντολές
- Προεπισκόπηση: άνοιγμα του `index.html` στον browser (δεν υπάρχει build ή dev server).
- Έλεγχος EL/EN (δεν τυπώνει τίποτα αν όλα είναι εντάξει): `echo '{"tool_input":{"file_path":"index.html"}}' | node .claude/hooks/check-lang.js`
- Deploy: δες την ενότητα «Deploy».

## Δομή του `index.html`
- Με τη σειρά: inline `<style>`, `<nav>`, ενότητες `#about`, `#skills`, `#projects`, `#contact`, και στο τέλος ένα `<script>`.
- Νέα ενότητα χρειάζεται και δίγλωσσο `<li><a href="#id">` στο `<nav>`.
- Το `<script>` έχει τρία μέρη: γλώσσα (`setLang()`), θέμα (`currentTheme()` / `updateThemeIcon()`), φόρμα (`validate()`, `showError()`, `t()`, `fetch` στο `FORM_ENDPOINT`).

## Δίγλωσσο περιεχόμενο (EL / EN)
- Κάθε κείμενο υπάρχει δύο φορές: `<span lang="el">…</span><span lang="en">…</span>` (ή `<p lang="…">`).
  Το CSS (`html[lang="el"] [lang="en"] { display: none; }` και το αντίστροφο) κρύβει τη γλώσσα που δεν είναι ενεργή.
- **Κάθε νέο ή αλλαγμένο κείμενο πρέπει να γραφτεί και στις δύο γλώσσες.**
- Ό,τι δεν είναι HTML (placeholders, μηνύματα σφάλματος της φόρμας, `<title>`) υπάρχει σε JS objects με κλειδιά `el` / `en` (`titles`, placeholders, `messages`).
- Η `setLang()` αλλάζει το `<html lang>`, και αυτό αρκεί για να εμφανιστεί η σωστή γλώσσα στο HTML. Τα κείμενα από JS (`<title>`, placeholders) τα ενημερώνει η ίδια, ενώ τα μηνύματα της φόρμας τα δίνει η `t(key)`.
- Η επιλεγμένη γλώσσα αποθηκεύεται στο `localStorage.lang`. Η προεπιλογή είναι `el`.
  Μια άγνωστη τιμή στο `localStorage.lang` (όχι `el`/`en`) γυρίζει σε `el`, πριν κληθεί η `setLang()`.

## Θέμα (light / dark)
- Τα χρώματα ορίζονται ως CSS μεταβλητές στο `:root`. Για το dark υπάρχουν σε `@media (prefers-color-scheme: dark)` και `:root[data-theme="dark"]`.
- Νέα χρώματα μπαίνουν ως μεταβλητές και στα δύο θέματα, όχι απευθείας σε τιμές. Τα δύο σκούρα blocks πρέπει να μένουν ίδια.
- **Αντίθεση: κάθε χρώμα κειμένου πρέπει να έχει αντίθεση ≥ 4.5:1 (WCAG AA) με το φόντο του, σε ανοιχτό ΚΑΙ σκούρο θέμα.**
  - Κείμενο πάνω σε φόντο `--accent` (κουμπιά, hover) παίρνει `color: var(--on-accent)`, ποτέ `#fff`. Στο σκούρο θέμα το accent είναι ανοιχτό, οπότε το λευκό δεν διαβάζεται.
  - Ο έλεγχος γίνεται με `node .claude/hooks/check-contrast.js index.html`, που τρέχει και αυτόματα ως hook. Αν προσθέσεις νέο συνδυασμό κειμένου και φόντου, πρόσθεσέ τον στη λίστα `PAIRS` του script.
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
- **Ποτέ `git push` ή deploy χωρίς να ρωτήσεις πρώτα τον χρήστη, κάθε φορά.** Ένα push στο `main` ανεβάζει αυτόματα τη σελίδα online. Το `permissions.ask` στο `.claude/settings.json` το επιβάλλει.

## Deploy (Cloudflare Pages)
- Project: `portfolio-gkolfos`. Live: https://portfolio-gkolfos.pages.dev
- **Κάθε push στο `main`** (από οπουδήποτε) κάνει αυτόματα deploy μέσω GitHub Actions (`.github/workflows/deploy.yml`).
  Χρειάζεται το secret `CLOUDFLARE_API_TOKEN` στο GitHub repo. Ανεβαίνουν **μόνο** τα αρχεία της σελίδας (html και εικόνες στη ρίζα), όχι τα `CLAUDE.md`, `.claude/` και `.github/`.
- Πρόοδος του deploy: https://github.com/cgkol2005/portfolio/actions
- Χειροκίνητο deploy, μόνο αν το ζητήσει ο χρήστης: `echo {} | node .claude/hooks/deploy.js` (ανεβάζει το `HEAD`).
  **Όχι** `wrangler pages deploy .`, γιατί αυτό θα ανέβαζε δημόσια και τα `CLAUDE.md` και `.claude/`.
- Μετά το push, έλεγχος με `curl -s https://portfolio-gkolfos.pages.dev/` ότι η αλλαγή φαίνεται online. Το deploy θέλει περίπου 1 λεπτό.

## Skills
- `/portfolio-add [δεξιότητα|project] <περιγραφή>` (`.claude/skills/portfolio-add/SKILL.md`): προσθέτει δεξιότητα ή project σε EL και EN, και μετά κάνει commit, push και deploy.

## Hooks (`.claude/settings.json`)
- `check-lang.js`: μετά από αλλαγή στο `index.html`, ελέγχει ότι υπάρχει ίδιος αριθμός `lang="el"` και `lang="en"`, και ότι τα el/en blocks στο JS έχουν τα ίδια κλειδιά.
- `check-contrast.js`: μετά από αλλαγή στο `index.html`, ελέγχει ότι όλοι οι συνδυασμοί κειμένου και φόντου έχουν αντίθεση ≥ 4.5:1 και στα δύο θέματα, και ότι δεν υπάρχουν σταθερά χρώματα κειμένου εκτός των μεταβλητών.
- `git-reminder.js`: στο τέλος κάθε απάντησης, εμφανίζει μήνυμα αν υπάρχουν αλλαγές χωρίς commit ή push.

## Κινητό
- **Κάθε αλλαγή πρέπει να δουλεύει σε κινητό (πλάτος 375px):** χωρίς οριζόντιο scroll, χωρίς κομμένο κείμενο, και τα κουμπιά να πατιούνται εύκολα.
- Οι προσαρμογές για κινητό βρίσκονται στο `@media (max-width: 600px)` στο τέλος του `<style>`. Οι διατάξεις με `display: grid` ή `flex` πολλών στηλών πρέπει να γίνονται μία στήλη εκεί, όπως το `.form-row`. Οι σειρές με flex χρειάζονται `flex-wrap: wrap`, και τα μεγάλα κείμενα χωρίς κενά (π.χ. URLs) `word-break`.
- Έλεγχος: `bash .claude/tools/mobile-preview.sh <φάκελος>`. Βγάζει ένα PNG με τη σελίδα σε 375px, σε ανοιχτό και σκούρο θέμα δίπλα-δίπλα. Διάβασέ το με το Read.
  Μην τραβάς screenshot με `--window-size=375` απευθείας: το headless Chrome δεν στενεύει κάτω από ~500px και δίνει ψεύτικο κόψιμο του κειμένου.

## Έλεγχος αλλαγών
Δεν υπάρχουν tests. Μετά από κάθε αλλαγή στο `index.html`:
1. `check-lang.js` και `check-contrast.js`: τρέχουν αυτόματα ως hooks.
2. `bash .claude/tools/mobile-preview.sh <φάκελος>` και έλεγχος του screenshot σε κινητό, ανοιχτό και σκούρο θέμα.
