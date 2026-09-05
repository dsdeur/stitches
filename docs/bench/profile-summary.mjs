import fs from 'fs'
const dir = process.argv[2]
const file = fs.readdirSync(dir).find(f => f.endsWith('.cpuprofile'))
const p = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'))
const byId = new Map(p.nodes.map(n => [n.id, n]))
const self = new Map()
const dt = p.timeDeltas
for (let i = 0; i < p.samples.length; i++) {
	const n = byId.get(p.samples[i])
	const cf = n.callFrame
	const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber}:${cf.columnNumber}`
	self.set(key, (self.get(key) || 0) + (dt[i] || 0))
}
const total = [...self.values()].reduce((a, b) => a + b, 0)
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)
for (const [k, v] of rows) console.log(`${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`)
