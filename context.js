export const context = new AudioContext()
export const F = context.sampleRate

window.addEventListener('unload', () => context.close())