let sequence
sequence = matrix('matrix2.txt')
sequence = sequence.scale(16)
sequence = sequence.flatMap(({ value }) => matrix('matrix1.txt').mapValues(v => value + v))
sequence = sequence.scale(1 / 4)
sequence = sequence.loop(4)
sequence.table()

const eventToAudioProcess = sequencerEvent => {
    const userobject = {
        sin({ sin: value, duration: d }) {
            return sin(note(value)).adsr({ duration: beats(d) })
        },
        square({ square: value, duration: d }) {
            return square(note(value))
                .adsr({ duration: beats(d) })
                .gain(0.5)
        },
        saw({ saw: value, duration: d }) {
            return saw(note(value))
                .adsr({ duration: beats(d) })
                .gain(0.5)
        },
        triangle({ triangle: value, duration: d }) {
            return triangle(note(value)).adsr({ duration: beats(d) })
        },
    }
    const audioProcesses = _.keys(sequencerEvent)
        .filter(key => _.has(userobject, key))
        .reduce((audioProcesses, key) => {
            const audioProcess = userobject[key](sequencerEvent)
            if (audioProcess) {
                audioProcesses.push(audioProcess)
            }
            return audioProcesses
        }, [])
    if (_.isEmpty(audioProcesses)) {
        return nullAudioProcess
    } else {
        return mix(...audioProcesses)
    }
}

let tune = sequencerToAudioProcess(sequence, eventToAudioProcess)
tune = tune.gain(0.1)
tuno = tune.reverb(.27)
return tune
