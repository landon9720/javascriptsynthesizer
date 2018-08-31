import _ from 'lodash'
import { superFactory } from './superFactory'
import parameterFunction from './parameterFunction';

function options(samplesPerFrame = 1, samplesPerSecond = 1, samplesPerBeat = 1) {
    return { samplesPerFrame, samplesPerSecond, samplesPerBeat }
}

function assertFrame(frame, values) {
    console.assert(frame instanceof Float32Array)
    console.assert(values instanceof Array)
    const f = Array.from(frame)
    expect(f.length).toEqual(values.length)
    for (let i = 0; i < values.length; ++i) {
        expect(f[i]).toBeCloseTo(values[i], 3)
    }
}

test('sin(1)', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(1)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 1, 0, -1])
    const frame2 = await processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})

test('sin(1).sample()', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = await sin(1).sample(2)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 1, 0, -1])
    const frame2 = await processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})

test('sin(1).gain(.5).add(.1)', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(1)
        .gain(0.5)
        .add(0.1)
    const processAudio = await audioProcess.initialize()
    const frame = await processAudio()
    assertFrame(frame, [0.1, 0.6, 0.1, -0.4])
})

test('sin(2)', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(2)
    const processAudio = await audioProcess.initialize()
    const frame = await processAudio()
    assertFrame(frame, [0, 0, 0, 0])
})

test('sum(sin(2), sin(3))', async () => {
    const { sum, sin } = superFactory(options(4, 4))
    const audioProcess = sum(sin(2), sin(3))
    const processAudio = await audioProcess.initialize()
    const frame = await processAudio()
    assertFrame(frame, [0, -1, 0, 1])
})

test('value(i => i / 4)', async () => {
    const { value } = superFactory(options(4, 4))
    const audioProcess = value(i => i / 4)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 0.25, 0.5, 0.75])
    const frame2 = await processAudio()
    assertFrame(frame2, [1, 1.25, 1.5, 1.75])
})

// test('value(i => i / 4).toFunction()', async () => {
//     const { value } = superFactory(options(4, 4))
//     const audioProcess = value(i => i / 4)
//     const processAudio = await audioProcess.initialize()
//     const f = await audioProcess.toFunction()
//     expect(await f(0)).toBeCloseTo(0)
//     expect(await f(1)).toBeCloseTo(.25)
//     expect(await f(2)).toBeCloseTo(.5)
//     expect(await f(3)).toBeCloseTo(.75)
//     expect(await f(4)).toBeCloseTo(1)
//     expect(await f(5)).toBeCloseTo(1.25)
//     expect(await f(6)).toBeCloseTo(1.5)
//     expect(await f(7)).toBeCloseTo(1.75)
// })

// test('parameterFunction', async () => {
//     const f = parameterFunction(i => i / 4)
//     expect(await f(0)).toBeCloseTo(0)
//     expect(await f(1)).toBeCloseTo(.25)
//     expect(await f(2)).toBeCloseTo(.5)
//     expect(await f(3)).toBeCloseTo(.75)
//     expect(await f(4)).toBeCloseTo(1)
//     expect(await f(5)).toBeCloseTo(1.25)
//     expect(await f(6)).toBeCloseTo(1.5)
//     expect(await f(7)).toBeCloseTo(1.75)
//     await f.initialize()
//     expect(await f(0)).toBeCloseTo(0)
//     expect(await f(1)).toBeCloseTo(.25)
// })

test('delaySamples', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(1).delaySamples(1)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 0, 1, 0])
    const frame2 = await processAudio()
    assertFrame(frame2, [-1, 0, 1, 0])
})

test('delayFrames', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(1).delayFrames(1)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 0, 0, 0])
    const frame2 = await processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})

test('delay', async () => {
    const { sin } = superFactory(options(4, 4))
    const audioProcess = sin(1).delay(6)
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 0, 0, 0])
    const frame2 = await processAudio()
    assertFrame(frame2, [0, 0, 0, 1])
    const frame3 = await processAudio()
    assertFrame(frame3, [0, -1, 0, 1])
})

// test('AudioProcess toFunction', async () => {
//     const { sin } = superFactory(options(4, 4))
//     const audioProcess = sin(1)
//     const processAudio = await audioProcess.initialize()
//     const f = audioProcess.toFunction()
//     expect(await f(0)).toBe(0)
// })

test('Sequencer.mix.delay.repeat', async () => {
    const { sequencer } = superFactory(options(4, 4))
    const r = sequencer([{ time: 1 }])
        .mix(sequencer([{ time: 2 }]))
        .delay(1)
        .repeat(2, 3)
        .processSequence()
    expect(r).toEqual([{ time: 2 }, { time: 3 }, { time: 5 }, { time: 6 }])
})

test('Sequencer.map', async () => {
    const { sequencer } = superFactory(options(4, 4))
    const r = sequencer([{ time: 1 }])
        .map(e => _.extend({}, e, { foo: 'bar' }))
        .processSequence()
    expect(r).toEqual([{ time: 1, foo: 'bar' }])
})

test('Sequencer.toAudioProcess', async () => {
    const { sequencer, sin } = superFactory(options(4, 4))
    const audioProcess = sequencer([{ time: 0, value: 0 }]).toAudioProcess(e => sin(1))
    const processAudio = await audioProcess.initialize()
    const frame1 = await processAudio()
    assertFrame(frame1, [0, 1, 0, -1])
    const frame2 = await processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})
