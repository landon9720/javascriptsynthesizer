import P from 'parsimmon'
import _ from 'lodash'
import Sequencer from './Sequencer'

const Parser = P.createLanguage({
    Root: p => {
        return p.Matrix.atLeast(1).map(matrixes => _.keyBy(matrixes, 'id'))
    },
    Matrix: p => {
        return P.seqObj(
            P.newline.many(),
            ['header', p.Header],
            ['datarows', p.DataRow.atLeast(1)],
            P.newline.many()
        ).map(({ header, datarows }) => _.extend({ datarows }, header))
    },
    Header: () => {
        return P.seqObj(
            ['id', P.regex(/\w+ */)],
            P.string('|'),
            ['duration', P.regex(/ */)],
            P.string('|'),
            P.newline
        ).map(({ id, duration }) => {
            return {
                id: id.trim(),
                duration: duration.length,
            }
        })
    },
    DataRow: () => {
        return P.seqObj(
            ['key', P.regex(/\+?[\w\.]+/)],
            P.optWhitespace,
            P.string('|'),
            ['input', P.regex(/[\w ]+/)],
            P.string('|').times(0, 1),
            P.newline
        )
    },
})

function charCodeValueInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters continue from 10
        return charCode - 87
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export default textInput => {
    const matrixes = Parser.Root.tryParse(textInput)
    return _.mapValues(matrixes, matrix => {
        const duration = matrix.duration
        console.assert(_.isInteger(duration), 'duration must be integer')
        const events = []
        let channel
        const carry = {}
        for (let i = 0; i < duration; ++i) {
            let event
            matrix.datarows.forEach(row => {
                if (row.key.startsWith('+')) {
                    // modify above event
                    let metaKey = row.key.slice(1)
                    console.assert(metaKey, 'metaKey')
                    let metaValue = row.input.charCodeAt(i)
                    if (!_.isUndefined(metaValue)) {
                        metaValue = charCodeValueInterpreter(metaValue)
                        if (!_.isNull(metaValue)) {
                            if (event) {
                                event = _.assign(event, { [metaKey]: metaValue })
                            }
                            carry[channel] = carry[channel] || {}
                            carry[channel][metaKey] = metaValue
                        }
                    }
                } else {
                    const ix1 = row.key.indexOf('.')
                    const ix2 = row.key.indexOf('.', ix1 + 1)
                    console.assert(
                        (ix1 === -1 && ix2 === -1) || ix1 + 2 === ix2,
                        `!ix1 && !ix2 || ix1 + 2 === ix2 ${row.key} ${ix1} ${ix2}`
                    )
                    const defaults = {
                        octave: 0,
                        invert: 0,
                        duration: 1,
                    }
                    if (ix1 !== -1 && ix2 !== -1) {
                        // channel.value.metakey-metavalue
                        channel = row.key.slice(0, ix1)
                        console.assert(channel, 'channel')
                        let value = row.key.charCodeAt(ix1 + 1)
                        console.assert(!_.isNull(value), '!_.isNull(value) 1')
                        value = charCodeValueInterpreter(value)
                        console.assert(!_.isNull(value), '!_.isNull(value) 2')
                        let metaKey = row.key.slice(ix2 + 1)
                        console.assert(metaKey, 'metaKey')
                        let metaValue = row.input.charCodeAt(i)
                        if (!_.isUndefined(metaValue)) {
                            metaValue = charCodeValueInterpreter(metaValue)
                            if (!_.isNull(metaValue)) {
                                if (event) {
                                    events.push(event)
                                }
                                event = _.assign({}, defaults, carry[channel], {
                                    time: i,
                                    channel,
                                    value,
                                    [metaKey]: metaValue,
                                })
                            }
                        }
                    } else {
                        // channel-value
                        channel = row.key
                        let value = row.input.charCodeAt(i)
                        if (!_.isUndefined(value)) {
                            value = charCodeValueInterpreter(value)
                            if (!_.isNull(value)) {
                                if (event) {
                                    events.push(event)
                                }
                                event = _.assign({}, defaults, carry[channel], { time: i, channel, value })
                            }
                        }
                    }
                }
                if (event) {
                    events.push(event)
                }
            })
        }
        return new Sequencer(() => events, matrix.duration)
    })
}
