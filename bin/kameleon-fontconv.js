#!/usr/bin/env node

const path = require('path')
const program = require('commander')
const config = require('../package.json')
const fontconv = require('../lib/fontconv')

program
  .version(config.version)
  .arguments('<source>')
  .option('-w, --width-var', 'handle as variable-width font')
  .option('-t, --target <target>', 'target file name')
  .action(source => {
    var target = path.basename(source, '.bdf') + '.js'
    if (program.target) {
      target = program.target
    }
    var options = {
      widthVar: program.widthVar
    }
    fontconv.convert(source, target, options)
  })
  .parse(process.argv)
