export const define = <T, S>(target: T, source: S): T & S => Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) as T & S
