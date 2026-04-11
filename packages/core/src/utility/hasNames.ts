export const hasNames = (target: Record<string, unknown>): boolean => {
	for (const name in target) return true
	return false
}
