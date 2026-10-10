// Drive the app with a list of steps and take screenshots along the way.
// Usage: node scripts/interact.mjs <url> step step ...
//   wait:<ms>        press:<key>        click:<css selector>
//   shot:<out.png>   (a bare name goes to docs/progress/<name>.png)
// Env: W, H (viewport, default 1440×810), REDUCED=1 for prefers-reduced-motion.
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [url, ...steps] = process.argv.slice(2)
const exe = ['/opt/pw-browsers/chromium'].find((p) => existsSync(p))
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({
  viewport: { width: +(process.env.W ?? 1440), height: +(process.env.H ?? 810) },
  reducedMotion: process.env.REDUCED === '1' ? 'reduce' : 'no-preference',
})
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
for (const step of steps) {
  const i = step.indexOf(':')
  const op = step.slice(0, i)
  const arg = step.slice(i + 1)
  if (op === 'wait') await page.waitForTimeout(+arg)
  else if (op === 'press') await page.keyboard.press(arg)
  else if (op === 'click') await page.click(arg)
  else if (op === 'shot') {
    const out = arg.includes('/') || arg.endsWith('.png') ? arg : `docs/progress/${arg}.png`
    mkdirSync(dirname(out), { recursive: true })
    await page.screenshot({ path: out })
    console.log(out)
  } else throw new Error(`unknown step ${step}`)
}
await browser.close()
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors')
