/**
 * Cascade audit: reports where switching `cascade` from 'legacy' to 'declared' changes which
 * declaration wins for an element.
 *
 *   tsx docs/bench/cascade-audit.mts legacy.css declared.css page.html
 *
 * legacy.css / declared.css: `getCssText()` output of the same render in each mode.
 * page.html: the rendered markup; every class="..." attribute is treated as one element.
 *
 * Generated rules are single-class selectors with equal specificity, so within one context the
 * last matching rule wins per property. Contexts are viewports: every distinct `min-width` in
 * the sheets becomes a viewport (plus the base one), and a min-width rule applies at every
 * viewport at least that wide, which is what makes two breakpoints compete. Media queries that
 * are not a plain min-width are treated as their own context. The audit resolves the winner for
 * every element and (context, selector suffix, property) in both sheets and prints the differences.
 * Exit code 1 when there are differences, so it can gate a migration in CI.
 */
import { readFileSync } from 'node:fs'

interface Rule {
	className: string
	suffix: string
	media: string
	declarations: Record<string, string>
}

const splitTopLevel = (text: string): string[] => {
	const out: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') depth++
		else if (text[i] === '}' && --depth === 0) {
			out.push(text.slice(start, i + 1))
			start = i + 1
		}
	}
	return out
}

const parseDeclarations = (body: string): Record<string, string> => {
	const declarations: Record<string, string> = {}
	for (const declaration of body.split(';')) {
		const colon = declaration.indexOf(':')
		if (colon > 0) declarations[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim()
	}
	return declarations
}

/** Flattens a stitches sheet into rules in sheet order. Nested @media inside groups becomes the rule's media. */
const parseSheet = (cssText: string): Rule[] => {
	const rules: Rule[] = []

	const visit = (text: string, media: string): void => {
		for (const rule of splitTopLevel(text)) {
			const brace = rule.indexOf('{')
			const head = rule.slice(0, brace).trim()
			const body = rule.slice(brace + 1, -1)

			if (head.startsWith('--sxs')) continue
			if (head.startsWith('@media')) {
				visit(body, head === '@media' ? media : head.slice('@media'.length).trim())
				continue
			}
			if (head.startsWith('@')) continue

			for (const selector of head.split(',')) {
				const match = /^\.((?:[\w-]|\\.)+)(.*)$/.exec(selector.trim())
				if (!match) continue
				rules.push({ className: match[1].replace(/\\(.)/g, '$1'), suffix: match[2], media, declarations: parseDeclarations(body) })
			}
		}
	}

	visit(cssText, '')
	return rules
}

/** Pixel value of a plain `(min-width: Npx)` query, or null for anything else. */
const minWidthOf = (media: string): number | null => {
	const match = /^\(min-width:\s*([\d.]+)px\)$/.exec(media.trim())
	return match ? Number(match[1]) : null
}

type Context = number | string

/** Viewports (0 plus every min-width seen, ascending) followed by every other media query verbatim. */
const contextsOf = (...sheets: Rule[][]): Context[] => {
	const widths = new Set<number>([0])
	const others = new Set<string>()
	for (const rules of sheets) {
		for (const rule of rules) {
			if (!rule.media) continue
			const width = minWidthOf(rule.media)
			if (width === null) others.add(rule.media)
			else widths.add(width)
		}
	}
	return [...[...widths].sort((a, b) => a - b), ...others]
}

const appliesIn = (rule: Rule, context: Context): boolean => {
	if (typeof context === 'string') return rule.media === context
	const width = rule.media ? minWidthOf(rule.media) : 0
	return width !== null && width <= context
}

const describeContext = (context: Context): string => (typeof context === 'number' ? `>=${context}px` : context)

/** For one element: winning class and value per (context, suffix, property). */
const resolve = (rules: Rule[], classes: Set<string>, contexts: Context[]): Map<string, { winner: string; value: string }> => {
	const winners = new Map<string, { winner: string; value: string }>()
	for (const context of contexts) {
		for (const rule of rules) {
			if (!classes.has(rule.className) || !appliesIn(rule, context)) continue
			for (const property in rule.declarations) {
				winners.set(`${describeContext(context)}|${rule.suffix}|${property}`, { winner: rule.className, value: rule.declarations[property] })
			}
		}
	}
	return winners
}

const [legacyPath, declaredPath, htmlPath] = process.argv.slice(2)
if (!legacyPath || !declaredPath || !htmlPath) {
	console.error('usage: tsx docs/bench/cascade-audit.mts legacy.css declared.css page.html')
	process.exit(2)
}

const legacy = parseSheet(readFileSync(legacyPath, 'utf8'))
const declared = parseSheet(readFileSync(declaredPath, 'utf8'))
const contexts = contextsOf(legacy, declared)

const elements = new Set<string>()
for (const match of readFileSync(htmlPath, 'utf8').matchAll(/class="([^"]*)"/g)) elements.add(match[1].trim())

let differences = 0
for (const classList of elements) {
	const classes = new Set(classList.split(/\s+/))
	const before = resolve(legacy, classes, contexts)
	const after = resolve(declared, classes, contexts)
	const lines: string[] = []
	for (const key of new Set([...before.keys(), ...after.keys()])) {
		const b = before.get(key)
		const a = after.get(key)
		if (b?.value === a?.value) continue
		const [context, suffix, property] = key.split('|')
		lines.push(`  ${property}${suffix ? ` on "${suffix}"` : ''} at ${context}: ${b ? `${b.value} (${b.winner})` : 'unset'} -> ${a ? `${a.value} (${a.winner})` : 'unset'}`)
	}
	if (lines.length) {
		differences += lines.length
		console.log(`class="${classList}"`)
		for (const line of lines) console.log(line)
	}
}

console.log(differences ? `\n${differences} difference(s) across ${elements.size} element(s).` : `No differences across ${elements.size} element(s).`)
process.exit(differences ? 1 : 0)
