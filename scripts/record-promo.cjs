#!/usr/bin/env node
// Records the promo videos from promo.html, frame by frame, so pixel art stays crisp.
// Dev-only tool: needs Playwright and ffmpeg installed (the library itself has no dependencies).
//
//   python3 -m http.server 8765 &        # serve the repo
//   node scripts/record-promo.cjs        # -> docs/promo/*.mp4, docs/promo/gameplay.gif, docs/promo/code.gif
//   node scripts/record-promo.cjs http://localhost:8765 fx-reel   # only jobs whose name contains 'fx-reel'
//
// The page clock is frozen and stepped one frame at a time, so the result does
// not depend on how fast the machine is.

const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const { mkdirSync, rmSync, mkdtempSync } = require('node:fs')
const { join } = require('node:path')
const os = require('node:os')

const BASE = process.argv[2] ?? 'http://localhost:8765'
const ONLY = process.argv[3] ?? ''
const OUT = join(__dirname, '..', 'docs', 'promo')

const JOBS = [
  { name: 'pixspell-reel-en.mp4', url: '/promo.html?lang=en', viewport: [1080, 1920], seconds: 15, fps: 30 },
  { name: 'pixspell-reel-ko.mp4', url: '/promo.html?lang=ko', viewport: [1080, 1920], seconds: 15, fps: 30 },
  { name: 'gameplay.gif', url: '/promo.html?mode=clip', viewport: [1024, 768], seconds: 10, fps: 15, selector: '#game' },
  // the README's first picture: code typed on the left, the art it makes on the right (full size, so the code stays readable)
  { name: 'code.gif', url: '/codereel.html', viewport: [960, 420], seconds: 15.5, fps: 12, gifScale: 1, colors: 64 },
  // the AI-built example game playing itself, 30 s into a run so the screen is busy
  { name: 'survivors.gif', url: '/examples/spell-survivors/?demo&warm=30', viewport: [700, 560], seconds: 7, fps: 10, gifScale: 1, colors: 64, selector: '#game' },
  // a grid of 25 effects is busy footage: a little more compression keeps these near 4 MB
  { name: 'fx-reel-en.mp4', url: '/fxreel.html?lang=en', viewport: [1080, 1920], seconds: 17, fps: 30, crf: 21 },
  { name: 'fx-reel-ko.mp4', url: '/fxreel.html?lang=ko', viewport: [1080, 1920], seconds: 17, fps: 30, crf: 21 },
]

async function record(browser, job) {
  const dir = mkdtempSync(join(os.tmpdir(), 'pixspell-frames-'))
  const page = await browser.newPage({ viewport: { width: job.viewport[0], height: job.viewport[1] } })
  await page.clock.install({ time: 0 })
  await page.goto(BASE + job.url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // install() lets time keep flowing in real time; pause it so only runFor() moves it
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50)
  const target = job.selector ? page.locator(job.selector) : page
  const total = job.seconds * job.fps
  for (let i = 0; i < total; i++) {
    await page.clock.runFor(1000 / job.fps)
    await target.screenshot({ path: join(dir, `f${String(i).padStart(4, '0')}.png`) })
    if (i % job.fps === 0) process.stdout.write(`\r${job.name}: ${Math.round((i / total) * 100)}%`)
  }
  await page.close()
  const input = ['-y', '-framerate', String(job.fps), '-i', join(dir, 'f%04d.png')]
  if (job.name.endsWith('.gif')) {
    execFileSync('ffmpeg', [...input, '-vf',
      `scale=iw*${job.gifScale ?? 0.5}:ih*${job.gifScale ?? 0.5}:flags=neighbor,split[a][b];[a]palettegen=max_colors=${job.colors ?? 96}:stats_mode=full[p];[b][p]paletteuse=dither=none`,
      '-loop', '0', join(OUT, job.name)], { stdio: 'ignore' })
  } else {
    execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(job.crf ?? 16),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, job.name)], { stdio: 'ignore' })
  }
  rmSync(dir, { recursive: true, force: true })
  process.stdout.write(`\r${job.name}: done          \n`)
}

;(async () => {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const job of JOBS.filter((j) => j.name.includes(ONLY))) await record(browser, job)
  await browser.close()
})()
