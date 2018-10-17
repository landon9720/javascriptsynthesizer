import _ from 'lodash'

export default class Sequencer {
    constructor(processSequence, duration, bpm) {
        console.assert(processSequence instanceof Function, 'processSequence must be a function')
        console.assert(_.isFinite(duration), `sequencer duration ${duration}`)
        console.assert(_.isFinite(bpm) && bpm > 0, `sequencer bpm ${bpm}`)
        this.processSequence = processSequence
        this.duration = duration
        this.bpm = bpm
    }
    beatsPerMinute(bpm) {
        return new Sequencer(this.processSequence, this.duration, bpm)
    }
    mix(sequencer) {
        console.assert(sequencer instanceof Sequencer, 'mix sequencer must be a sequencer')
        return new Sequencer(() => {
            return _.sortBy([...this.processSequence(), ...sequencer.processSequence()], 'time')
        }, Math.max(this.duration || 0, sequencer.duration || 0), this.bpm)
    }
    map(mapEvent, mappedDuration = this.duration) {
        return new Sequencer(() => {
            return this.processSequence().map(mapEvent)
        }, mappedDuration, this.bpm)
    }
    mapValue(mapValueFunction) {
        return this.map(e => new Event(e, { value: mapValueFunction(e.value) }))
    }
    // use this sequence to trigger that sequence
    // the time basis is THIS
    trigger1(that) {
        return this.processSequence().reduce((result, sequencerEvent) => {
            return result.mix(that.map(e => sequencerEvent.operator(e)).shift(sequencerEvent.time))
        }, new Sequencer(() => [], 0, this.bpm))
    }
    // use this sequence to trigger that sequence
    // the time basis is THAT
    trigger2(that) {
        return this.processSequence().reduce((result, sequencerEvent) => {
            return result.mix(that.map(e => sequencerEvent.operator(e)).shift(result.duration))
        }, new Sequencer(() => [], 0, this.bpm))
    }
    shift(delta) {
        if (!delta) return this
        return this.map(e => new Event(e, { time: e.time + delta }), (this.duration || 0) + delta)
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
        return new Sequencer(() => events, duration, this.bpm)
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
        console.log(`sequencer ${name} duration ${this.duration} bpm ${this.bpm}`)
        const events = this.processSequence()
        const keys = ['time', 'channel', 'value', 'duration']
        console.table(events, keys)
    }
    scale(factor) {
        console.assert(factor && _.isFinite(factor), 'scale factor')
        return this.map(e => {
            const e1 = { time: e.time * factor }
            if (e.duration) {
                e1.duration = e.duration * factor
            }
            return new Event(e, e1)
        }, (this.duration || 0) * factor)
    }
    transpose(scale) {
        console.assert(scale instanceof Sequencer, 'transpose scale must be sequencer')
        const sequencerEvents = scale.processSequence()
        const indexedEvents = _.groupBy(sequencerEvents, 'time')
        let maskLength = 0
        while (_.some(indexedEvents[maskLength++], e => (e.value === 0 || e.value === 1))) { }
        console.assert(maskLength-- > 0, 'maskLength must be > 0')
        const mask = _.range(0, maskLength).map(t => [
            t,
            _.some(indexedEvents[t], e => e.value === 1),
        ])
        scale = _(mask)
            .filter(([t, v]) => v)
            .map(([t, v]) => t)
            .value()
        console.assert(!_.isEmpty(scale), 'sequenceToScale scale is empty')
        return this.map(e => {
            let value = e.value
            let octave = 0
            while (value < 0) {
                value += scale.length
                --octave
            }
            while (value >= scale.length) {
                value -= scale.length
                ++octave
            }
            value = scale[value]
            console.assert(_.isInteger(value), 'scale value is not integer')
            value += octave * 12
            return new Event(e, { value })
        })
    }
    filter(eventPredicate) {
        return new Sequencer(() => this.processSequence().filter(eventPredicate), this.duration, this.bpm)
    }
    channel(...channels) {
        return this.filter(e => _.find(channels, c => e.channel === c))
    }
}

export class Event {
    constructor(...assignFrom) {
        if (assignFrom) {
            _.assign(this, ...assignFrom)
        }
    }
    operator(that) {
        console.assert(_.isInteger(this.value), 'Event this.value must be integer')
        console.assert(that instanceof Event, 'Event operator that instanceof Event')
        console.assert(_.isInteger(that.value), 'Event that.value must be integer')
        return new Event(that, { value: this.value + that.value })
    }
}
