# MASTER PROMPT — GridPulse: cinematic transformer health dashboard

You are Claude Code. Do this whole job yourself: set up the project folder, unpack the
design references, build the app phase by phase, check your own work visually against the
references, and finally prepare it for GitHub and Netlify. I (Ankit) will only review
screenshots and reply "continue" or give fixes.

Read this entire prompt before running any command.

---

## PART A — Project setup (do this yourself, then report)

### A1. Work out where you are running
- Detect the OS and whether you are running on my Windows laptop or in a cloud/Linux
  container.
- **On my Windows laptop:** the project root is `C:\Projects\gridpulse-dashboard`.
  Create `C:\Projects` and the project folder if they don't exist. If you cannot write
  outside your current working directory, create `gridpulse-dashboard` inside the current
  working directory instead and tell me the full path.
- **In a cloud container / attached GitHub repo:** the project root is the repo root.

From now on, every file and command lives inside the project root. Do **not** create a
nested project subfolder (scaffold Vite directly into the root).

### A2. Find and unpack the design references
I am giving you `reference-frames.zip` (attached to this message). If you can't find it
as an attachment, search in this order: the current working directory, then
`%USERPROFILE%\Downloads`, then `%USERPROFILE%\Desktop`, then `%USERPROFILE%\Documents`.
If it is in none of those, stop and ask me where it is.

Extract it so the result is **exactly**:

```
<project root>/
  reference/
    01-hero.png             main screen, idle state
    02-snapshot-card.png    white "snapshot" card slid up from the bottom
    03-modal-animating.png  detail modal mid-animation (bar growing, numbers counting)
    04-modal-final.png      detail modal fully open
    transformer.png         real photo of our substation transformer
```

On Windows you can use
`Expand-Archive -Path <zip> -DestinationPath <project root> -Force`.
If the extraction produced `reference/reference/...`, move the files up one level and
delete the empty inner folder. Then list the folder to prove the five files are there.

### A3. Save this prompt into the project
Save this entire prompt as `SPEC.md` in the project root, so it survives if the session is
closed and you have to re-read it later.

### A4. Check the tools
Run `node -v`, `npm -v` and `git --version`. Node must be 18 or newer. If Git is missing,
tell me and continue without it. Run `git init` in the project root and add a sensible
`.gitignore` (node_modules, dist, .env, .netlify).

### A5. Look at the references, then summarise back to me
Open and look at **every image in `reference/`**. Then, **before writing any app code**,
reply with:
1. the final folder path and a listing of `reference/`;
2. a 6–8 line summary of what the dashboard will look like and how the reference design maps
   to the transformer (it must mention the particle copper winding coil, the current pulse,
   the Health Index orb whose edge changes with the fault, and the Dissolved gases modal).

Then **stop and wait for me to say "go"** before Phase 1.

---

## PART B — What we are building

### B1. Context
This is a portfolio piece for my final-year electrical engineering + ML project:
**Intelligent Transformer Health Monitoring using Dissolved Gas Analysis (DGA) and ML**.
GitHub: https://github.com/AR0714/transformer-health-dga.
Real results: a calibrated XGBoost model reaches **80.0% accuracy** on a sealed 70-sample
test set, against **57.1%** for the classical Duval triangle (+23 points). SHAP confirms the
model relies on acetylene (C₂H₂) to detect arcing (SHAP +0.74). Calibration cut the expected
calibration error (ECE) from 0.15 to 0.10.

The visual design is copied from a Dribbble health-app concept called "artery" (screen
recording frames are in `reference/`). In the original, a glowing particle DNA helix sits
behind an "Estimated Biological Age" number inside a ring of fire. **Our version keeps the
look, layout, motion and polish as close to the reference as possible**, but changes the
subject to a power transformer:

- the DNA helix becomes a **copper transformer winding coil** made of glowing particles (a
  winding really is a helix), with electric current flowing along it;
- the age number becomes a **Health Index (0–100)** computed from DGA of the transformer oil.

**Goal: someone who has seen the reference should say "this is that design, made for a
transformer".** Match spacing, proportions, type sizes, radii, colours and motion closely.

### B2. Exact layout (measure against `reference/01-hero.png`)
- Page background: very dark warm near-black (around `#140E12`). One big hero panel fills the
  viewport with ~24px margin on left/right and a small top margin; corner radius ~28px;
  `overflow: hidden`. Everything is inside this panel.
- **Top-left**: logo mark (circle containing a stylised coil/bolt glyph, white line icon)
  + wordmark **"gridpulse"** in lowercase, white, ~40px, regular weight.
- **Top-centre**: small circled "?" icon (about/help, opens a short "How this works" popover).
- **Top-right**: two-line bold white label, right-aligned, ~32px: **"UNIT-07"** on line 1,
  **"Substation"** on line 2; to its right a ~72px circular avatar showing a crop of
  `reference/transformer.png` with a warm yellow ring, like the reference avatar.
- **Health orb**: left side, vertically centred slightly below middle, ~330px diameter.
  A pure-black disc with a flame/plasma edge (tendrils that crackle outward ~30–40px).
  Inside, centred: two-line label **"Transformer / Health Index"** (white, ~18px semibold)
  and a huge number (white, bold, ~110px, tight tracking).
- **3D coil scene**: fills the whole panel behind the UI. The coil runs diagonally from
  behind the orb (bottom-left) to the top-right corner and out of frame, exactly like the
  DNA in the reference: big, close to camera, partly cropped.
- **Bottom-right stack** (~250px wide, ~24px from right edge):
  - dark translucent glass card (`rgba(40,36,40,0.75)`, blur, radius ~22px, ~135px tall):
    **"Next oil sample"** (white, ~20px semibold, two lines allowed), below it small grey
    text **"in 12 days"**, and a round black arrow button bottom-right;
  - below it, a gradient card (orange `#E8704A` → pink `#E7A0A0` → pale sky `#BFE3F0`,
    diagonal) with **"Diagnosis"** and a white pill showing the fault, e.g.
    **"N · Healthy"** / **"D2 · Arcing"**, plus a round arrow button. This card is cropped
    by the bottom edge of the panel, exactly as in the reference.
- **Slide-up card** (see `02-snapshot-card.png`): a white card ~300px wide, radius ~22px,
  left of the bottom-right stack, rising from below the panel's bottom edge:
  **"Maintenance actions"** (black, ~20px semibold, two lines) + small grey
  **"Recommendations"** + a round grey chevron-down button.
- Small, discreet **scenario switcher** under the orb: five tiny pills
  `N · PD · T1 · T3 · D2` in white at 50% opacity (the active one at 100% with a
  hairline border). Keys 1–5 also switch.
- **Footer line** at the very bottom-left of the panel, tiny, 40% white:
  "Simulated sensor data · Calibrated XGBoost, 80% accuracy on sealed test set · GitHub".

### B3. Exact motion (taken frame by frame from the recording)
- **Coil**: slow continuous rotation around its own axis (one revolution ≈ 40–60 s) plus a
  very slight camera drift. Particles twinkle individually (random phase brightness).
- **Current pulse**: a bright white-yellow core with an orange halo travels along one strand
  of the coil and jumps along some rungs, like the lightning streak in the reference;
  it loops forever, ~2.5 s per pass in the healthy state.
- **Dust**: hundreds of small particles drift slowly; a few large, very blurred orange
  bokeh orbs sit in the top-left and corners.
- **Orb edge**: tendrils flicker constantly (noise-driven), never static.
- **Number**: when the score changes it **ticks one integer at a time** (e.g. 34 → 33 → 32),
  ~120–180 ms per step, each digit change a short vertical slide + fade. In the reference
  the number drifts continuously between 28 and 34; in ours the Health Index drifts ±1–2
  around the scenario's value every few seconds as the live gases jitter, and counts
  step-by-step to a new value when the scenario changes.
- **Slide-up card**: rises from below with a spring (≈ 450 ms), stays, and slides back down.
  Show it automatically 4 s after load, and on click of the "Next oil sample" arrow.
  Its chevron button collapses it; clicking the card body expands it to show the three
  maintenance actions for the current scenario.
- **Modal open** (see `03` and `04`): the scene dims to ~45% and blurs slightly; the white
  card fades + scales in from 0.96 to 1 over ~350 ms (in the recording, the card is still
  semi-transparent for the first few frames). Then the **stacked bar grows from the left**
  and **every percentage counts up from 0.0%** to its final value over ~1.4 s, ease-out.
  The bar's unfilled remainder is light grey until it's full.
- **Modal close**: reverse fade (~250 ms), scene un-dims.
- All scenario transitions (colours, pulse speed, orb behaviour, number) blend over
  0.8–1.2 s. Never hard cuts.

### B4. Fault scenarios (the data)
Put this in `src/data/scenarios.ts`. Every ~3 s add ±4% random jitter to each gas, then
recompute every derived value.

| Code | Name | Health | Model confidence | H₂ | CH₄ | C₂H₆ | C₂H₄ | C₂H₂ | CO | CO₂ |
|---|---|---|---|---|---|---|---|---|---|---|
| N | Normal operation | 92 | 94% | 50 | 25 | 15 | 18 | 0.5 | 280 | 1500 |
| PD | Partial discharge | 68 | 82% | 850 | 45 | 20 | 25 | 2 | 310 | 1600 |
| T1 | Thermal fault < 300 °C | 55 | 78% | 60 | 180 | 120 | 45 | 1 | 650 | 3200 |
| T3 | Thermal fault > 700 °C | 35 | 87% | 95 | 420 | 85 | 680 | 18 | 890 | 4100 |
| D2 | High-energy arcing | 12 | 93% | 2400 | 350 | 60 | 890 | 420 | 520 | 2800 |

Gas values are ppm. IEC 60599 typical limits: H₂ 150, CH₄ 130, C₂H₆ 90, C₂H₄ 90, C₂H₂ 3,
CO 600, CO₂ 5700.

Top SHAP drivers:
- N: C₂H₂ −0.42, C₂H₄/C₂H₆ −0.28, H₂ −0.19
- PD: H₂ +0.61, CH₄/H₂ +0.34, C₂H₂ −0.23
- T1: CH₄/H₂ +0.58, CO +0.41, C₂H₆ +0.29
- T3: C₂H₄/C₂H₆ +0.67, C₂H₄ +0.45, CH₄ +0.31
- D2: C₂H₂ +0.74, C₂H₂/C₂H₄ +0.48, H₂ +0.31

Fleet risk (probability × severity): N 0.06, PD 1.64, T1 2.34, T3 3.48, D2 4.65.
Next oil sample: N "in 12 days" · PD "in 1 month → re-sample now" · T1 "in 2 weeks" ·
T3 "weekly" · D2 "online, continuous".
Duval triangle output per scenario: N "T1" (Duval can never say healthy), PD "PD",
T1 "T1", T3 "T3", D2 "D2".

For each scenario write one plain-English interpretation sentence and three maintenance
actions (e.g. D2: "Acetylene above 400 ppm means power arcing inside the tank" →
de-energize; internal inspection; check tap changer and bushings). Keep them technically
correct per IEC 60599:2022 / IEEE C57.104-2019.

### B5. How the visuals react to the fault (the signature feature)
- **N**: orb edge calm amber-gold with soft, slow flicker; pulse slow and smooth; coil warm
  copper.
- **PD**: occasional small blue-white corona sparks pop off the orb edge and off random
  points on the coil.
- **T1**: orange flame tendrils like the reference, medium flicker.
- **T3**: hotter: yellow-white inner rim, faster flicker, slightly larger tendrils; pulse
  faster and brighter.
- **D2**: orb edge turns red-orange with **jagged lightning arcs** jumping around the rim;
  coil pulse becomes fast and stuttering with random bright discharges; a thin red strip
  slides down at the top of the panel: "Critical: high-energy arcing (D2). De-energize and
  inspect." The Diagnosis pill turns red.

### B6. "Dissolved gases" modal (rebuild of the reference "Blood" modal)
Opens when the orb or the Diagnosis card is clicked. White card, ~640px wide,
radius ~28px, padding ~40px, black text, exactly the reference's structure:
- Header row: round grey back button, title **"Dissolved gases"** (~26px semibold),
  round grey close button on the right.
- Description (small, grey-black): "Seven gases dissolved in the transformer oil, read live
  every 3 seconds."
- Row: **"Total dissolved combustible gas"** (semibold) with
  **"IEC 60599 · IEEE C57.104"** small on the right; below it the TDCG value, e.g.
  **"388 ppm"** (~26px semibold). TDCG = H₂ + CH₄ + C₂H₆ + C₂H₄ + C₂H₂ + CO.
- **Stacked bar** (~56px tall, square-ish ends like the reference) showing each
  combustible gas's share of TDCG; colours in the same family as the reference:
  orange `#F06A3A`, amber `#F5A23A`, yellow `#F5E63A`, green `#6CD04A`, violet `#9B2CF0`,
  plus a sixth teal `#3AB7C8`.
- Legend row: for each gas, small label (e.g. "Hydrogen H₂") and below it a coloured dot +
  big percentage (~24px).
- Verdict line (semibold): "All within IEC typical limits" or
  "3 gases above IEC typical limits".
- Nested bordered card: the most important gas for the current fault, e.g.
  **"Acetylene · C₂H₂"** / **"420 ppm"** / "IEC typical limit 3 ppm".
- Summary paragraph (semibold, ~16px) = the scenario interpretation.
- Below a hairline: **"Why the model decided"**: the three SHAP bars (red = pushes toward
  this fault, green = pushes away) and a compact comparison
  "Duval triangle: <its call> · 57.1% accuracy" vs
  "XGBoost (calibrated): <its call> · 80.0% accuracy".
- Esc, the close button, the back button and clicking the backdrop all close it. Focus is
  trapped inside while it is open.

### B7. Diagnostic assistant
A small round floating button at the bottom-left of the panel (above the footer text),
label on hover "Ask about this unit". Opens a compact white chat card in the same style.
- It sends the question + live context (scenario, health index, all 7 gases with limits,
  SHAP drivers, Duval vs ML) to **Groq** (`llama-3.3-70b-versatile`,
  `https://api.groq.com/openai/v1/chat/completions`) **through a Netlify Function**
  `netlify/functions/chat.ts` that reads `GROQ_API_KEY` from the environment.
  **The key must never reach the browser or the repo.** Add `.env.example` with
  `GROQ_API_KEY=` only.
- If the function errors or there's no key, answer from rule-based fallbacks built from the
  scenario data, so the demo always works.
- System prompt: transformer DGA diagnostics assistant, IEC 60599:2022 and
  IEEE C57.104-2019, answer in 2–4 plain sentences, quote actual ppm values, give a concrete
  maintenance action.
- Suggestion chips: "What fault is this?", "Is it safe to keep running?",
  "Why does acetylene matter?"

### B8. Tech stack (don't add other dependencies without asking me)
- Vite + React + TypeScript
- three.js via `@react-three/fiber` + `@react-three/drei`
- `@react-three/postprocessing` (Bloom, DepthOfField, Vignette, subtle Noise)
- custom GLSL shaders: particle coil (`THREE.Points` + ShaderMaterial with size
  attenuation and soft round sprites), current pulse (moving bright band along the helix
  parameter), orb edge (fbm/simplex-noise flame ring; draw it on a full-quad shader or a
  2D canvas layered under the HTML number)
- `framer-motion` for cards, modal, number ticks
- Tailwind CSS
- Zustand for scenario + live gas state
- Fonts: **Inter** (or Manrope) via `@fontsource` packages, not a CDN link
- Netlify Functions + `netlify.toml` (build `npm run build`, publish `dist`,
  functions `netlify/functions`)

### B9. Particle coil — how to get the reference look
- Two interleaved helices (HV and LV windings), radius ~1.2 units, pitch tuned so ~3 turns
  are visible on screen, plus rungs/strands between them made of particles (like DNA base
  pairs) to keep the silhouette of the reference.
- ~15–25k particles total. Particle sizes vary (most tiny, some large and bright). Colours
  mostly copper/amber/gold `#FF9A3C` → `#FFD08A`, with ~10% dusty violet-blue `#6B5A8C` on
  the shadow side, exactly like the reference's purple-ish strand interiors.
- Additive blending, depth write off, strong Bloom (threshold low, intensity ~1.2–1.6),
  DepthOfField focused on the middle of the coil so the near and far ends turn into bokeh.
- A faint vertical laminated core column (dim grey-violet particles) behind/inside the coil
  is welcome if it doesn't clutter.

### B10. Project structure
```
src/
  main.tsx, App.tsx, index.css
  data/scenarios.ts
  store/useMonitor.ts
  lib/dga.ts                 TDCG, ratios, limit checks, health drift
  scene/Scene.tsx            Canvas, camera, postprocessing
  scene/WindingCoil.tsx      particles + pulse shader
  scene/Dust.tsx             dust + bokeh orbs
  ui/TopBar.tsx
  ui/HealthOrb.tsx           flame ring + ticking number
  ui/ScenarioSwitch.tsx
  ui/SideCards.tsx
  ui/ActionsCard.tsx
  ui/GasModal.tsx
  ui/Assistant.tsx
  ui/AlertStrip.tsx
public/transformer.jpg       resized (≤ 400px) copy of reference/transformer.png
netlify/functions/chat.ts
netlify.toml, .env.example, README.md
```

### B11. Quality bar
- 60 fps on a normal laptop: cap DPR at 1.75, pause rendering when the tab is hidden,
  dispose GPU resources on unmount.
- `prefers-reduced-motion`: stop rotation, pulses and flicker; show a still frame.
- Responsive: at ≤ 768px the orb moves to the top centre (~240px), the coil sits behind it
  at lower opacity, the cards stack below, nothing scrolls sideways.
- Accessible: real `<button>`s, visible focus rings, modal focus trap, Esc closes.
- No console errors. `npm run build` passes with no TypeScript errors.

---

## PART C — How to work: phases, with a visual check after each

Do **one phase at a time**. After each phase:
1. run the dev server (`npm run dev`, port 5173) and tell me to open
   `http://localhost:5173`;
2. take a screenshot with Playwright (install `playwright` as a dev dependency and use its
   bundled Chromium; on the first run `npx playwright install chromium`), at 1440×810;
3. **compare it side by side with the matching reference image**, list the 3–5 biggest
   visual differences, fix them, and screenshot again;
4. commit with a clear message (`git commit -m "Phase N: ..."`);
5. stop and wait for my "continue" or my fixes.

| Phase | Build | Compare with |
|---|---|---|
| 1 | Vite/React/TS/Tailwind scaffold in the root, fonts, hero panel, top bar, orb as a plain black circle with the number, static bottom-right cards, footer | `01-hero.png` (layout, sizes, positions) |
| 2 | 3D particle winding coil + dust + bokeh orbs + Bloom + DepthOfField, slow rotation | `01-hero.png` (glow, depth, density) |
| 3 | Current pulse travelling along the coil | `01-hero.png` (the bright streak) |
| 4 | Orb flame edge + ticking number animation | `01-hero.png` (orb edge) |
| 5 | Scenario data, live jitter, health drift, scenario switcher, fault-dependent visual states (B5), alert strip | all five states screenshotted |
| 6 | Slide-up Maintenance actions card + Dissolved gases modal with growing bar and counting percentages | `02`, `03`, `04` |
| 7 | Assistant + Netlify Function + fallback answers; test the fallback with no key | — |
| 8 | Performance pass, reduced motion, mobile layout (screenshot at 390×844), `npm run build`, test with `npx netlify dev` | everything |

If a phase's result looks clearly worse than the reference, say so honestly and propose
what to change; don't call it done.

---

## PART D — Finish line

When Phase 8 passes:
1. Write `README.md`: what it is, a screenshot (save to `docs/screenshot.png`), the tech
   stack, how to run locally, how to set `GROQ_API_KEY`, the honest note "sensor data is
   simulated; the model metrics come from the transformer-health-dga project", and a link
   to https://github.com/AR0714/transformer-health-dga.
2. If the GitHub CLI (`gh`) is installed and logged in, create a public repo
   **`gridpulse-dashboard`** under my account and push. If it isn't, give me the exact
   commands to install it (`winget install GitHub.cli`), log in (`gh auth login`), and
   push.
3. Give me click-by-click steps to deploy on Netlify from that GitHub repo, where to paste
   `GROQ_API_KEY` (Site configuration → Environment variables), and how to rename the site
   to `transformer-dga.netlify.app`.

Start now with **PART A**, then stop after A5 and wait for my "go".
