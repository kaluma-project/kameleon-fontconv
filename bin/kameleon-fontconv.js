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
  .option('-a, --use-array', 'use array for data (instead of base64 encoding)')
  .action(source => {
    var target = path.basename(source, '.bdf') + '.js'
    if (program.target) {
      target = program.target
    }
    var options = {
      widthVar: program.widthVar,
      useArray: program.useArray
    }
    fontconv.convert(source, target, options)
  })
  .parse(process.argv)
