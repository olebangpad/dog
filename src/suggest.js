// "Did you mean ...?" for names that don't exist: the closest few by edit distance (typos, a swapped pair of letters,
// a missing or extra letter), so `spell('sowrd')` points at `sword` instead of a list of 900 ids.

/** Edit distance with transpositions (optimal string alignment). */
export function distance(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  let prev2 = null, prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1)
      cur.push(d)
    }
    prev2 = prev
    prev = cur
  }
  return prev[n]
}

/** The closest candidates to name (at most n), best first; none if nothing is close. */
export function closest(name, candidates, n = 3) {
  const q = String(name ?? '').toLowerCase()
  if (!q) return []
  const limit = Math.max(1, Math.min(3, Math.floor(q.length / 3)))
  const scored = []
  const seen = new Set()
  candidates.forEach((c, order) => {
    if (seen.has(c)) return
    seen.add(c)
    const lc = c.toLowerCase()
    let d = distance(q, lc)
    // 'crown' for 'hat-crown', 'meteor' for 'fx-meteor': a whole part of a hyphenated name counts as close
    if (d > limit && lc.split('-').some((part) => part.length > 2 && distance(q, part) <= limit)) d = limit
    if (d <= limit) scored.push({ c, d, order })
  })
  return scored.sort((a, b) => a.d - b.d || a.c.length - b.c.length || a.order - b.order).slice(0, n).map((s) => s.c)
}

/** ' Did you mean "x" or "y"?' or '' when nothing is close. */
export function didYouMean(name, candidates, n = 3) {
  const hits = closest(name, candidates, n)
  if (!hits.length) return ''
  return ` Did you mean ${hits.map((h) => `"${h}"`).join(hits.length > 2 ? ', ' : ' or ').replace(/, ("[^"]+")$/, ' or $1')}?`
}
