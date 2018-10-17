// Parse content of script.js. Execute each script. Generate markdown output.
const fs = require('fs')
const { spawnSync } = require('child_process')

function runCode(js, key) {
    const command = '../zigzag'
    const p = spawnSync(command, ['-a', js, '-o', `dist/${key}.wav`], { stdio: 'pipe', encoding: 'utf-8' })
    p.stdout && console.log(p.stdout)
    p.stderr && console.error(p.stderr)
}

const outputFileName = 'pages/index.md'
if (fs.existsSync(outputFileName)) {
    fs.unlinkSync(outputFileName)
}
function print(s = '') {
    fs.appendFileSync(outputFileName, `${s}\n`)
}

let codeBlockNumber = 0
const input = fs.readFileSync('script.js', { encoding: 'utf-8' })
const lines = input.split(/\n/)
const codeBuffer = []
lines.forEach(line => {
    if (line.startsWith('// ')) {
        if (codeBuffer.length > 0) {
            const code = codeBuffer.join('\n')
            runCode(code, ++codeBlockNumber)
            print(`\`\`\`\n${code}\n\`\`\``)
            print(`[${codeBlockNumber}.wav](http://zigzag.software/${codeBlockNumber}.wav)\n`)
            codeBuffer.length = 0
        }
        print(line.slice(3))
    } else if (line.length === 0) {
        print()
    } else {
        codeBuffer.push(line)
    }
})
