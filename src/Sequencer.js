import _ from 'lodash'

export default class Sequencer {
    constructor(processSequence, duration) {
        console.assert(processSequence instanceof Function, 'processSequence must be a function')
        console.assert(_.isFinite(duration), `sequencer duration ${duration}`)
        this.processSequence = processSequence
        this.duration = duration
    }
    mix(sequencer) {
        console.assert(sequencer instanceof Sequencer, 'mix sequencer must be a sequencer')
        return new Sequencer(() => {
            return _.sortBy([...this.processSequence(), ...sequencer.processSequence()], 'time')
        }, Math.max(this.duration || 0, sequencer.duration || 0))
    }
    map(mapEvent, mappedDuration = this.duration) {
        return new Sequencer(() => {
            return this.processSequence().map(mapEvent)
        }, mappedDuration)
    }
    mapValue(mapValueFunction) {
        return this.map(e => {
            const [value, octave, invert] = mapValueFunction([e.value, e.octave, e.invert])
            return _.extend({}, e, { value, octave, invert })
        })
    }
    flatMap(mapEventToSequence) {
        let result = NullSequencer
        this.processSequence().forEach(sequencerEvent => {
            const s = mapEventToSequence(sequencerEvent).shift(sequencerEvent.time)
            console.assert(s instanceof Sequencer, 'flatMap mapEventToSequence must return a sequencer')
            result = result.mix(s)
        })
        return result
    }
    flatMap2(mapEventToSequence) {
        let result = NullSequencer
        this.processSequence().forEach(sequencerEvent => {
            const s = mapEventToSequence(sequencerEvent).shift(result.duration)
            console.assert(s instanceof Sequencer, 'flatMap2 mapEventToSequence must return a sequencer')
            result = result.mix(s)
        })
        return result
    }
    shift(delta) {
        if (!delta) return this
        return this.map(e => _.extend({}, e, { time: e.time + delta }), (this.duration || 0) + delta)
    }
    concat(...sequencers) {
        console.assert(_.isArray(sequencers), 'concat requires sequencers array')
        sequencers = [this, ...sequencers]
        let events = []
        let duration = 0
        _.forEach(sequencers, sequencer => {
            sequencer = sequencer.shift(duration)
            console.assert(sequencer instanceof Sequencer, 'concat sequencers must be array of sequencers')
            events.push(...sequencer.processSequence())
            duration = sequencer.duration
        })
        events = _.sortBy(events, 'time')
        return new Sequencer(() => events, duration)
    }
    loop(times) {
        console.assert(times && _.isInteger(times), 'loop times')
        let result = this
        while (--times) {
            result = result.concat(this)
        }
        return result
    }
    table(name) {
        if (name) {
            console.log(`sequencer ${name}`)
        }
        const events = this.processSequence()
        const keys = ['time', 'channel', 'value', 'octave', 'invert', 'duration']
        console.table(events, keys)
    }
    scale(factor) {
        console.assert(factor && _.isFinite(factor), 'scale factor')
        return this.map(e => {
            const e1 = { time: e.time * factor }
            if (e.duration) {
                e1.duration = e.duration * factor
            }
            return Object.assign({}, e, e1)
        }, (this.duration || 0) * factor)
    }
    transpose(scale, channel = 'value') {
        console.assert(scale instanceof Sequencer, 'transpose scale must be sequencer')
        console.assert(channel && _.isString(channel), 'sequenceToScale channel must be string')
        const sequencerEvents = scale.processSequence()
        const indexedEvents = _.groupBy(sequencerEvents, 'time')
        let maskLength = 0
        while (_.some(indexedEvents[maskLength++], e => e.channel === channel && (e.value === 0 || e.value === 1))) {}
        console.assert(maskLength-- > 0, 'maskLength must be > 0')
        const mask = _.range(0, maskLength).map(t => [
            t,
            _.some(indexedEvents[t], e => e.channel === channel && e.value === 1),
        ])
        scale = _(mask)
            .filter(([t, v]) => v)
            .map(([t, v]) => t)
            .value()
        console.assert(!_.isEmpty(scale), 'sequenceToScale scale is empty')
        return this.map(e => {
            let rank = e.value
            let octave = e.octave
            while (rank < 0) {
                rank += scale.length
                octave -= 1
            }
            while (rank >= scale.length) {
                rank -= scale.length
                octave += 1
            }
            const value = scale[rank]
            return Object.assign({}, e, { value, octave })
        })
    }
    filter(eventPredicate) {
        return new Sequencer(() => this.processSequence().filter(eventPredicate), this.duration)
    }
    channel(...channels) {
        return this.filter(e => _.find(channels, c => e.channel === c))
    }
}

export const NullSequencer = new Sequencer(() => [], 0)
