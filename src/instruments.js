import { sin, sum } from './factories'
import { nil } from './AudioProcess'

export function borg(f, duration) {
    const down = (f, a) => (a > 0 ? sum(down(f / 2, a - 0.01), sin(f / 2, a - 0.01)) : nil)
    const up = (f, a) => (a > 0 ? sum(up(f * 2, a - 0.03), sin(f * 2, a - 0.03)) : nil)
    return sum(down(f, 0.2), sin(f, 0.1), up(f, 0.1)).adsr({
        A: 1000,
        D: 1000,
        S: 0.4,
        R: 1000,
        duration,
    })
}
