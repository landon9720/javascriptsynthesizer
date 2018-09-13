import P from 'parsimmon'
import _ from 'lodash'

export default P.createLanguage({
    Root: p => {
        return p.Matrix.atLeast(1).map(matrixes => _.keyBy(matrixes, 'id'))
    },
    Matrix: p => {
        return P.seqObj(
            P.newline.many(),
            ['header', p.Header],
            ['datarows', p.DataRow.atLeast(1)],
            P.newline.many(),
        ).map(({ header, datarows }) => _.extend({ datarows }, header))
    },
    Header: () => {
        return P.seqObj(
            ['id', P.regex(/\w+ */)],
            P.string('|'),
            ['duration', P.regex(/ */)],
            P.string('|'),
            P.newline,
        ).map(({ id, duration }) => {
            return {
                id: id.trim(),
                duration: duration.length,
            }
        })
    },
    DataRow: () => {
        return P.seqObj(
            ['key', P.regex(/[\w\.]+/)],
            P.optWhitespace,
            P.string('|'),
            ['data', P.regex(/[\w ]+/)],
            P.string('|').times(0, 1),
            P.newline,
        )
    },
})
