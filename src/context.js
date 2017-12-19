export const context = new AudioContext()
export const F = context.sampleRate
import scriptNodeFactory from './scriptNodeFactory'

const analyser = context.createAnalyser()
analyser.minDecibels = -90 // default -90
analyser.maxDecibels = -30 // default -30
analyser.smoothingTimeConstant = .1
analyser.fftSize = Math.pow(2, 14)

const bufferLength = analyser.frequencyBinCount
const dataArray = new Uint8Array(bufferLength)
const viz1 = document.getElementById('viz1')
const viz1context = viz1.getContext('2d')
viz1.width = viz1.offsetWidth
viz1.height = viz1.offsetHeight
function draw() {
    analyser.getByteTimeDomainData(dataArray)
    // viz2context.fillStyle = 'rgb(0, 0, 0)'
    viz1context.fillRect(0, 0, viz1.width, viz1.height)
    viz1context.lineWidth = 2
    viz1context.strokeStyle = 'rgb(150, 0, 0)'
    viz1context.beginPath()
    const sliceWidth = viz1.width * 1.0 / bufferLength
    let x = 0
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = v * viz1.height / 2
        if (i === 0) {
            viz1context.moveTo(x, y)
        } else {
            viz1context.lineTo(x, y)
        }
        x += sliceWidth
    }
    viz1context.stroke()
}
draw()

const viz2 = document.getElementById('viz2')
const viz2context = viz2.getContext('2d')
viz2.width = viz2.offsetWidth
viz2.height = viz2.offsetHeight
const bufferLengthAlt = analyser.frequencyBinCount
const dataArrayAlt = new Uint8Array(bufferLengthAlt)

function drawAlt() {
    requestAnimationFrame(drawAlt)
    analyser.getByteFrequencyData(dataArrayAlt)
    viz2context.fillStyle = 'rgb(0, 0, 0)'
    viz2context.fillRect(0, 0, viz2.width, viz2.height)
    const barWidth = viz2.width / bufferLengthAlt * 2.5
    let barHeight
    let x = 0
    for (let i = 0; i < bufferLengthAlt; i++) {
        barHeight = dataArrayAlt[i]
        viz2context.fillStyle = `rgb(${barHeight + 100},50,50)`
        viz2context.fillRect(x, viz2.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
    }
}
drawAlt()

export function play(tune) {
    scriptNodeFactory(({ outputBuffer }) => {
        if (tune.counter % Math.pow(2, 5) === 0) {
            requestAnimationFrame(draw)
        }
        const tuneOutputBuffer =
            tune.counter < tune.numberOfFrames ? tune.processAudio() : context.createBuffer(1, 1024, 44100)
        const input = tuneOutputBuffer.getChannelData(0)
        const output = outputBuffer.getChannelData(0)
        for (let i = 0; i < 1024; ++i) {
            output[i] = input[i]
        }
    })
        .connect(analyser)
        .connect(context.destination)
}

window.addEventListener('unload', () => context.close())
