import Parser from '../src/parser'

test('defined', () => {
    expect(Parser).toBeDefined()
})

test('Root', () => {
    const text = `

A       |          |
labe.l  |datavalues

B       |          |
labe.l  |datavalues

`
    const a = Parser.Root.tryParse(text)
    expect(a).toEqual([
        { datarows: [{ data: 'datavalues', key: 'labe.l' }], duration: 10, id: 'A' },
        { datarows: [{ data: 'datavalues', key: 'labe.l' }], duration: 10, id: 'B' },
    ])
})
