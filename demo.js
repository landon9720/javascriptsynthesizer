// Split content of readme.js on newlines. Execute each script. Generate markdown output.
// The output is then copied manually into ../readme.md.
const fs = require('fs')
const { spawnSync } = require('child_process')

function runCode(js, key) {
    const command = './zigzag'
    const p = spawnSync(command, ['-a', js, '-o', `demo/${key}.wav`, '--quiet'], { stdio: 'pipe', encoding: 'utf-8' })
    console.error(p.stderr)
}

let codeBlockNumber = 0
const input = fs.readFileSync('readme.js', { encoding: 'utf-8' })
const lines = input.split(/\n/)
const codeBuffer = []
lines.forEach(line => {
    if (line.startsWith('// ')) {
        if (codeBuffer.length > 0) {
            const code = codeBuffer.join('\n')
            runCode(code, ++codeBlockNumber)
            console.log('```\n' + code + '\n```')
            console.log(`[${codeBlockNumber}.wav](https://raw.githubusercontent.com/landon9720/zigzag/master/demo/${codeBlockNumber}.wav)\n`)
            codeBuffer.length = 0
        }
        console.log(line.slice(3))
    } else if (line.length === 0) {
        console.log()
    } else {
        codeBuffer.push(line)
    }
})
