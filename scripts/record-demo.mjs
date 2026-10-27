// Records the frames for docs/demo.gif.
//
//   node scripts/record-demo.mjs [url] [outDir]
//   (defaults: https://transformer-dga.netlify.app, /tmp/gridpulse-frames)
//   HEADED=1 launches a visible browser (needs a display, e.g. xvfb-run).
//
// Time is driven by Playwright's fake clock: after the page settles, the clock is paused and
// advanced exactly 1/15 s per frame before each screenshot. Software WebGL renders far below
// 15 fps, so a real-time screenshot loop would be jerky and sped up; this keeps every frame on
// its true timestamp. Then run scripts/make-demo-gif.sh to build the GIF.
import { chromium } from 'playwright'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'https://transformer-dga.netlify.app'
const out = process.argv[3] ?? '/tmp/gridpulse-frames'
const FPS = 15
const DT = 1000 / FPS
const LEAD = 1 // seconds captured before the demo starts; only used for the loop crossfade
const SECONDS = LEAD + 14

// ?tick=40: the Health Index still counts one integer at a time, just faster, so 92 → 55 → 12
// fits the 2-second windows of the demo.
const url = new URL(base)
url.searchParams.set('tick', '40')

// Timeline in demo seconds (0 = first frame of the GIF).
const QUESTION = 'Should I de-energize?'
const TIMELINE = [
  [3.0, 'press', '3'], // T1 thermal fault
  [5.0, 'press', '5'], // D2 arcing: red alert strip
  [7.0, 'clickOrb'], // Dissolved gases modal
  [9.5, 'press', 'Escape'], // close it
  [10.0, 'clickChat'], // open the assistant
  [10.4, 'type', QUESTION], // one character per frame, then Enter
  [12.3, 'waitAnswer'], // make sure the reply is on screen
  [13.0, 'press', 'Escape'], // close the chat
  [13.0, 'press', '1'], // back to Normal for the loop
].map(([t, ...rest]) => [t + LEAD, ...rest])

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  headless: process.env.HEADED !== '1',
  executablePath: ['/opt/pw-browsers/chromium'].find((p) => existsSync(p)),
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error('page error:', String(e)))
// Frames are grabbed through the DevTools protocol: page.screenshot() waits for an animation
// frame, which never comes while the fake clock is paused.
const cdp = await page.context().newCDPSession(page)
const grab = async (path) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(path, Buffer.from(data, 'base64'))
}

await page.clock.install()
await page.goto(url.toString(), { waitUntil: 'networkidle' })
// Wait for both WebGL canvases (3D scene + orb flame), then let everything settle in real time
// (the maintenance card rises 4 s after load).
for (let i = 0; i < 100 && (await page.evaluate(() => document.querySelectorAll('canvas').length)) < 2; i++) {
  await new Promise((r) => setTimeout(r, 200))
}
await page.waitForTimeout(4500)
await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50)

const centre = async (selector) => {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`not found: ${selector}`)
  return [box.x + box.width / 2, box.y + box.height / 2]
}

// Poll from Node: page-side waits would use the paused (fake) timers.
const until = async (what, fn, ms = 20000) => {
  const t0 = Date.now()
  while (!(await page.evaluate(fn))) {
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 150))
  }
}

let typing = []
let ev = 0
const total = SECONDS * FPS
for (let f = 0; f < total; f++) {
  const t = f / FPS
  while (ev < TIMELINE.length && TIMELINE[ev][0] <= t + 1e-6) {
    const [, op, arg] = TIMELINE[ev++]
    if (op === 'press') await page.keyboard.press(arg)
    else if (op === 'clickOrb') {
      await page.mouse.click(...(await centre('button[aria-label^="Transformer Health Index"]')))
      await until('the gas modal', () => !!document.querySelector('[role=dialog][aria-modal=true]'))
    } else if (op === 'clickChat') {
      await page.mouse.click(...(await centre('button[aria-label="Ask about this unit"]')))
      await until('the chat card', () => !!document.querySelector('#assistant-input'))
      await page.evaluate(() => document.querySelector('#assistant-input').focus())
    } else if (op === 'type') typing = [...arg]
    else if (op === 'waitAnswer')
      await until('the assistant reply', () =>
        [...document.querySelectorAll('[aria-label="Diagnostic assistant"] p')].some((p) => /via Groq|Offline answer/.test(p.textContent)),
      )
  }
  if (typing.length) {
    await page.keyboard.type(typing.shift())
    if (!typing.length) await page.keyboard.press('Enter')
  }
  await page.clock.runFor(DT)
  await grab(`${out}/frame_${String(f + 1).padStart(4, '0')}.png`)
  if (f % 15 === 0) console.log(`frame ${f + 1}/${total}`)
}

const source = await page.evaluate(() =>
  [...document.querySelectorAll('[aria-label="Diagnostic assistant"] p')].map((p) => p.textContent).find((s) => /via Groq|Offline answer/.test(s ?? '')),
)
console.log(`done: ${total} frames in ${out}; assistant answer source: ${source ?? 'n/a'}`)
await browser.close()
