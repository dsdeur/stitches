declare global {
	interface Window {
		__webpack_nonce__?: string
		nonce?: string
	}
}

export const getNonce = (): string | null => {
	if (typeof window !== 'undefined' && typeof window.__webpack_nonce__ !== 'undefined') return window.__webpack_nonce__
	if (typeof window !== 'undefined' && typeof window.nonce !== 'undefined') return window.nonce
	return null
}
