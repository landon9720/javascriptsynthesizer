// Parse content of zigzag.software.md. Execute each script. Generate markdown output.
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

const input = fs.readFileSync('zigzag.software.md', { encoding: 'utf-8' })
const lines = input.split(/\n/)

let codeBlockNumber = 0
let codeBuffer
lines.forEach(line => {
    print(line)
    if (line.startsWith('```')) {
        if (!codeBuffer) {
            codeBuffer = []
        } else {
            const code = codeBuffer.join('\n')
            runCode(code, ++codeBlockNumber)
            print(`<audio controls><source src="/${codeBlockNumber}.wav" type="audio/wav"></audio>\n`)
            codeBuffer = null
        }
    } else if (codeBuffer) {
        codeBuffer.push(line)
    }
})
