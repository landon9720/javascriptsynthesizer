import P from 'parsimmon'
import _ from 'lodash'

const Parser = P.createLanguage({
    Root: p => {
        return p.Matrix.atLeast(1).map(matrixes => _.keyBy(matrixes, 'id'))
    },
    Matrix: p => {
        return P.seqObj(
            P.newline.many(),
            ['header', p.Header],
            ['datarows', p.DataRow.atLeast(1)],
            ['metarows', p.MetaRow.many()],
            P.newline.many(),
        ).map(({ header, datarows, metarows }) => _.extend({ datarows, metarows }, header))
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
            ['input', P.regex(/[\w ]*/)],
            P.string('|').times(0, 1),
            P.newline
        )
    },
    MetaRow: p => {
        return P.seqObj(
            ['symbol', P.regex(/\w+/)],
            P.string(':'),
            ['value', P.alt(P.regex(/\w+/), p.Number)],
            P.newline,
        )
    },
    Number: () => {
        return P.regex(/[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)/)
    }
})

export default textInput => {
    const textInputPreprocessed = textInput.split('\n').map(line => {
        // comments
        const a = line.indexOf('--')
        if (a !== -1) {
            line = line.slice(0, a)
            if (line === '') {
                return null
            }
        }
        return line
    }).filter(line => line !== null).join('\n')
    return Parser.Root.tryParse(textInputPreprocessed)
}
