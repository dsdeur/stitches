const { hasOwnProperty } = Object.prototype

export const hasOwn = (target: Record<string, unknown>, key: string): boolean => hasOwnProperty.call(target, key)
