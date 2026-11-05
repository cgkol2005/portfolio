# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portfolio — Χρήστος Γκόλφος

Προσωπικό portfolio, χωρίς build και χωρίς framework:
- `index.html`: όλο το περιεχόμενο, με inline CSS και JS (γλώσσα, θέμα, φόρμα επικοινωνίας).
- `chat.js` / `chat.css`: η συνομιλία (κουμπί στη γωνία, παράθυρο, ιστορικό).
- `functions/api/chat.js`: Cloudflare Pages Function `POST /api/chat`, που απαντά με το Claude API.
- `wrangler.toml`: ρυθμίσεις Cloudflare Pages (όνομα project, `compatibility_date`, `pages_build_output_dir = "dist"`). Δεν περιέχει secrets.
- `package.json`: υπάρχει μόνο για το `@anthropic-ai/sdk` της συνάρτησης. Το `.claude/package.json` (`"type": "commonjs"`) κρατά τα scripts των hooks σε CommonJS. **Μην το σβήσεις**, γιατί χωρίς αυτό σταματούν όλοι οι έλεγχοι.

## Εντολές
- Προεπισκόπηση: άνοιγμα του `index.html` στον browser. Η συνομιλία εκεί δεν απαντά, γιατί δεν υπάρχει `/api/chat`, και δείχνει «δεν είναι διαθέσιμη».
- Εγκατάσταση για τη συνάρτηση: `npm install`. Το `wrangler pages dev` δεν ξεκινά σε αυτό το περιβάλλον (σφάλμα «write EOF» του inspector). Η συνάρτηση δοκιμάζεται σε Node, εισάγοντας το `onRequestPost` με ψεύτικο `env` και `fetch`.
- Έλεγχος EL/EN (δεν τυπώνει τίποτα αν όλα είναι εντάξει): `echo '{"tool_input":{"file_path":"index.html"}}' | node .claude/hooks/check-lang.js`, και το ίδιο με `chat.js`.
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

## Συνομιλία (chat)
- **Browser (`chat.js`):** όλη η κατάσταση ζει στο `chatState` και αλλάζει μόνο μέσω των `addMessage`, `clearChat` και `setPending`, που αποθηκεύουν στο `sessionStorage['chat-history']` και καλούν την `render()`.
  - **sessionStorage, όχι localStorage:** η συνομιλία σβήνει όταν κλείσει η καρτέλα, ώστε κάθε νέος επισκέπτης να ξεκινά καινούρια, ακόμη και σε κοινόχρηστο υπολογιστή. Ο server δεν αποθηκεύει συνομιλίες.
  - Τα μηνύματα σφάλματος που δημιουργούνται τοπικά έχουν `local: true` και δεν στέλνονται στον server.
  - Τα κείμενα βρίσκονται στο `chatText` (el/en). Όταν αλλάζει το `<html lang>`, ένας `MutationObserver` ενημερώνει τα κείμενα της συνομιλίας.
- **Server (`functions/api/chat.js`):** διαβάζει το `index.html` μέσω `env.ASSETS` και κρατά μόνο το ορατό κείμενο (`extractPageText`). Στέλνει αυτό το κείμενο στο `claude-opus-5-5` (effort `low`, `fallbacks: 'default'`) με οδηγία να απαντά **μόνο** από αυτό.
  - Ό,τι προστίθεται στη σελίδα το «ξέρει» αυτόματα το chat. Ό,τι δεν γράφεται στη σελίδα (π.χ. ηλικία, τηλέφωνο) δεν το λέει.
- **Όρια:** ερώτηση έως **300** χαρακτήρες (`maxlength` και έλεγχος στο `chat.js`, και 400 `question_too_long` από τον server). Απάντηση έως **500** χαρακτήρες (οδηγία στο prompt και `limitAnswer()` στον server).
  - Αν αλλάξουν, πρέπει να αλλάξουν μαζί: `MAX_QUESTION` / `MAX_ANSWER` και στα δύο αρχεία, το `maxlength`, το «0/300» στο HTML και τα κείμενα `tooLong` / `label-chat-input`.
- **Κλειδί:** secret `ANTHROPIC_API_KEY` στο Cloudflare Pages. Ορίζεται από τον χρήστη με `npx wrangler pages secret put ANTHROPIC_API_KEY --project-name portfolio-gkolfos`. Χωρίς αυτό, το `/api/chat` επιστρέφει 503 και το chat γράφει «δεν είναι διαθέσιμη».

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
  Χρειάζεται το secret `CLOUDFLARE_API_TOKEN` στο GitHub repo. Ανεβαίνουν **μόνο** τα αρχεία της σελίδας (html, css, js και εικόνες στη ρίζα) και ο φάκελος `functions/`, όχι τα `CLAUDE.md`, `.claude/`, `.github/` και `package.json`. Το workflow τρέχει `npm ci`, γιατί η συνάρτηση χρειάζεται το SDK.
- Πρόοδος του deploy: https://github.com/cgkol2005/portfolio/actions
- Χειροκίνητο deploy, μόνο αν το ζητήσει ο χρήστης: `echo {} | node .claude/hooks/deploy.js` (ανεβάζει το `HEAD`, μαζί με το `functions/`).
  **Όχι** `wrangler pages deploy .`, γιατί αυτό θα ανέβαζε δημόσια και τα `CLAUDE.md` και `.claude/`.
- Μετά το push, έλεγχος με `curl -s https://portfolio-gkolfos.pages.dev/` ότι η αλλαγή φαίνεται online. Το deploy θέλει περίπου 1 λεπτό.

## Skills
- `/portfolio-add [δεξιότητα|project] <περιγραφή>` (`.claude/skills/portfolio-add/SKILL.md`): προσθέτει δεξιότητα ή project σε EL και EN, και μετά κάνει commit, push και deploy.

## Hooks (`.claude/settings.json`)
- `check-lang.js`: μετά από αλλαγή στο `index.html` ή στο `chat.js`, ελέγχει ότι υπάρχει ίδιος αριθμός `lang="el"` και `lang="en"`, και ότι τα el/en blocks στο JS έχουν τα ίδια κλειδιά.
- `check-contrast.js`: μετά από αλλαγή στο `index.html` ή στο `chat.css`, ελέγχει ότι όλοι οι συνδυασμοί κειμένου και φόντου έχουν αντίθεση ≥ 4.5:1 και στα δύο θέματα, και ότι δεν υπάρχουν σταθερά χρώματα κειμένου εκτός των μεταβλητών.
- `git-reminder.js`: στο τέλος κάθε απάντησης, εμφανίζει μήνυμα αν υπάρχουν αλλαγές χωρίς commit ή push.

## Κινητό
- **Κάθε αλλαγή πρέπει να δουλεύει σε κινητό (πλάτος 375px):** χωρίς οριζόντιο scroll, χωρίς κομμένο κείμενο, και τα κουμπιά να πατιούνται εύκολα.
- Οι προσαρμογές για κινητό βρίσκονται στο `@media (max-width: 600px)` στο τέλος του `<style>`. Οι διατάξεις με `display: grid` ή `flex` πολλών στηλών πρέπει να γίνονται μία στήλη εκεί, όπως το `.form-row`. Οι σειρές με flex χρειάζονται `flex-wrap: wrap`, και τα μεγάλα κείμενα χωρίς κενά (π.χ. URLs) `word-break`.
- Έλεγχος: `bash .claude/tools/mobile-preview.sh <φάκελος>`. Βγάζει ένα PNG με τη σελίδα σε 375px, σε ανοιχτό και σκούρο θέμα δίπλα-δίπλα. Διάβασέ το με το Read.
  Μην τραβάς screenshot με `--window-size=375` απευθείας: το headless Chrome δεν στενεύει κάτω από ~500px και δίνει ψεύτικο κόψιμο του κειμένου.

## Έλεγχος αλλαγών
Δεν υπάρχουν tests. Μετά από κάθε αλλαγή στο `index.html`, `chat.js` ή `chat.css`:
1. `check-lang.js` και `check-contrast.js`: τρέχουν αυτόματα ως hooks.
2. `bash .claude/tools/mobile-preview.sh <φάκελος>` και έλεγχος του screenshot σε κινητό, ανοιχτό και σκούρο θέμα.
