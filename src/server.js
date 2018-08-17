import express from 'express'

const app = express()

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: 'dist',
        headers: {
            'Content-Type': 'text/html',
        },
    })
})

app.get('/index.js', (req, res) => {
    res.sendFile('index.js', {
        root: 'dist',
        headers: {
            'Content-Type': 'application/javascript',
        },
    })
})

app.get('/audioworklet.js', (req, res) => {
    res.sendFile('audioworklet.js', {
        root: 'dist',
        headers: {
            'Content-Type': 'application/javascript',
        },
    })
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))
