import { context } from './context'

export default function scriptNodeFactory(processAudio, inputChannels = 0, outputChannels = 1) {
    const a = context.createScriptProcessor(1024, inputChannels, outputChannels)
    a.onaudioprocess = e => {
        processAudio(e)
        return e
    }
    return a
}
