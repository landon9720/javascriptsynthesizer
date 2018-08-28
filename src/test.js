import { audioProcessFactoryFactory } from './factories'
import AudioProcessReader from './AudioProcessReader'
import defer from './defer'

function options(samplesPerFrame = 1, samplesPerSecond = 1, samplesPerBeat = 1) {
    return { samplesPerFrame, samplesPerSecond, samplesPerBeat }
}

function assertFrame(frame, values) {
    const f = Array.from(frame)
    expect(f.length).toEqual(values.length)
    for (let i = 0; i < values.length; ++i) {
        expect(f[i]).toBeCloseTo(values[i], 3)
    }
}

test('sin(1)', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1)
    const frame1 = await audioProcess.processAudio()
    assertFrame(frame1, [0, 1, 0, -1])
    const frame2 = await audioProcess.processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})

test('sin(1).multiply(.5).add(.1)', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1)
        .multiply(0.5)
        .add(0.1)
    const frame = await audioProcess.processAudio()
    assertFrame(frame, [0.1, 0.6, 0.1, -0.4])
})

test('sin(2)', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(2)
    const frame = await audioProcess.processAudio()
    assertFrame(frame, [0, 0, 0, 0])
})

test('sum(sin(2), sin(3))', async () => {
    const { sum, sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sum(sin(2), sin(3))
    const frame = await audioProcess.processAudio()
    assertFrame(frame, [0, -1, 0, 1])
})

test('value(i => i / 4)', async () => {
    const { value } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = value(i => i / 4)
    const frame = await audioProcess.processAudio()
    assertFrame(frame, [0, 0.25, 0.5, 0.75])
})

test('delaySamples', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1).delaySamples(1)
    const frame1 = await audioProcess.processAudio()
    assertFrame(frame1, [0, 0, 1, 0])
    const frame2 = await audioProcess.processAudio()
    assertFrame(frame2, [-1, 0, 1, 0])
})

test('delayFrames', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1).delayFrames(1)
    const frame1 = await audioProcess.processAudio()
    assertFrame(frame1, [0, 0, 0, 0])
    const frame2 = await audioProcess.processAudio()
    assertFrame(frame2, [0, 1, 0, -1])
})

test('delay', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1).delay(6)
    const frame1 = await audioProcess.processAudio()
    assertFrame(frame1, [0, 0, 0, 0])
    const frame2 = await audioProcess.processAudio()
    assertFrame(frame2, [0, 0, 0, 1])
    const frame3 = await audioProcess.processAudio()
    assertFrame(frame3, [0, -1, 0, 1])
})

test('AudioProcessReader', async () => {
    const { sin } = audioProcessFactoryFactory(options(4, 4))
    const audioProcess = sin(1)
    const audioProcessReader = new AudioProcessReader(audioProcess, 2)
    audioProcessReader.on('data', buffer => {
        assertFrame(new Float32Array(buffer.buffer), [0, 1, 0, -1])
    })
    const d = defer()
    audioProcessReader.on('end', () => {
        d.resolve()
    })
    return d.promise
})

// import { Buffer } from 'buffer'
// import { PassThrough } from 'stream'

// test('read factory', async () => {
//     var buffer = new Buffer('foo')
//     var bufferStream = new PassThrough()
//     const d = defer()
//     bufferStream.on('end', () => {
//         d.resolve()
//     })
//     bufferStream.end(buffer)
//     bufferStream.pipe(process.stderr)
//     return d.promise
// })
