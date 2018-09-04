const sequence = matrix('matrix1.txt')
const eventToAudioProcess = ({ tick, kick, jar }) => {
    const audioProcesses = []
    if (_.isNumber(tick)) {
        audioProcesses.push(
            sin(note(tick))
                .adsr({ duration: beats(1 / 12) })
                .gain(0.1)
        )
    }
    if (_.isNumber(kick)) {
        audioProcesses.push(
            readFile('kick.raw')
                .offset(7817)
                .gain(0.5)
        )
    }
    if (_.isNumber(jar)) {
        audioProcesses.push(
            readFile('jar.raw')
                .offset(14142)
                .pitch(jar * 100)
        )
    }
    if (_.isEmpty(audioProcesses)) {
        return nullAudioProcess
    } else {
        return mix(...audioProcesses)
    }
}
return sequencerToAudioProcess(sequence, eventToAudioProcess)
