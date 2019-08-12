const fs = require('fs')

var lines = []
var index = 0
var createdByRasterFontEditor = false

/**
 * Font data
 */
var font = {
  version: '', // font format version
  glyphs: [], // glyph data
  first: 0,
  last: 0,
  width: 0,
  height: 0
}

function readFont () {
  while (index < lines.length) {
    var l = readLine()
    if (l[0] === 'STARTFONT') {
      font.version = l[1]
      // console.log(font.version)
    }
    if (l[0] === 'STARTCHAR') {
      readChar(l)
    }
    if (l.join(' ').indexOf('Raster Font Editor v0.14')) {
      createdByRasterFontEditor = true
    }
  }
}

function readChar (starLine) {
  var l = starLine
  var charIndex = l[1] * 1
  var encoding = 0
  var w = 0
  var h = 0
  var startBitmap = false
  var bitmapLines = []
  while (l[0] !== 'ENDCHAR') {
    if (l[0] === 'ENCODING') {
      encoding = l[1] * 1
    } else if (l[0] === 'BBX') {
      w = l[1] * 1
      h = l[2] * 1
    } else if (l[0] === 'BITMAP') {
      startBitmap = true
    } else if (l[0] === 'ENDCHAR') {
      startBitmap = false
    } else if (startBitmap) {
      bitmapLines.push(l.join(''))
    }
    l = readLine()
  }
  var hex = getBitmapHex(bitmapLines)
  var buffer = Buffer.from(hex, 'hex')
  var matrix = createMatrix(h, w)

  var bi = 0
  var bit = 0
  var bits = 0
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (!(bit & 7)) {
        bit = 0
        bits = buffer[bi]
        bi++
      }
      bit++
      if (bits & 0x80) {
        matrix[y][x] = 1
      }
      bits = (bits << 1)
    }
    bit = 0
    bits = 0
  }

  var glyph = {
    index: charIndex,
    encoding: encoding,
    width: w,
    height: h,
    matrix: matrix,
    bitmap: matrixToBytes(matrix)
  }
  font.glyphs.push(glyph)

  if (encoding === 0x41) { /* 'A' = 0x41, space=0x20 */
    // console.log(glyph)
    // printMatrix(matrix)
    /*
    console.log(`${encoding} [${String.fromCharCode(encoding)}] : (${w},${h}) : ${bitmapLines.join('')}`)
    console.log(buffer)
    console.log(matrix)
    console.log(matrixToBytes(matrix))
    */
  }
  // printMatrix(matrix)
}

function readLine () {
  var l = lines[index].trim()
  index++
  return l.split(' ')
}

/*
function printMatrix (matrix) {
  for (var y = 0; y < matrix.length; y++) {
    var r = matrix[y]
    console.log(r.map(c => c ? '*' : ' ').join(''))
  }
}
*/

/**
 * Convert bitmap lines of GBDF into hexadecimal string
 * Note that it handles the bug in bitmap ordering of Raster Font Editor v0.14
 * @param {Array<string>} bitmapLines
 * @return {string}
 */
function getBitmapHex (bitmapLines) {
  if (createdByRasterFontEditor) {
    var hexcode = bitmapLines.join('')
    var chucks = hexcode.match(/.{1,2}/g)
    var lines = new Array(bitmapLines.length)
    var lineIdx = 0
    for (var i = 0; i < chucks.length; i++) {
      if (lineIdx < bitmapLines.length) {
        if (!lines[lineIdx]) { lines[lineIdx] = '' }
        lines[lineIdx] = lines[lineIdx] + chucks[i]
        lineIdx++
        if (lineIdx >= bitmapLines.length) {
          lineIdx = 0
        }
      }
    }
    return lines.join('')
  } else {
    return bitmapLines.join('')
  }
}

function createMatrix (rows, columns) {
  var rowArray = new Array(rows)
  for (var i = 0; i < rows; i++) {
    var colArray = new Array(columns)
    colArray.fill(0)
    rowArray[i] = colArray
  }
  return rowArray
}

function matrixToBytes (matrix) {
  var rowSize = Math.floor((matrix[0].length + 7) / 8)
  var size = rowSize * matrix.length
  var buffer = new Uint8Array(size)
  for (var y = 0; y < matrix.length; y++) {
    var row = matrix[y]
    var sz = Math.floor((row.length + 7) / 8)
    var rowBuf = new Uint8Array(sz)
    rowBuf.fill(0)
    for (var x = 0; x < row.length; x++) {
      var idx = Math.floor(x / 8)
      var bit = 8 - (x % 8)
      if (matrix[y][x]) {
        rowBuf[idx] = rowBuf[idx] | (1 << (bit - 1))
      }
    }
    for (var z = 0; z < sz; z++) {
      buffer[y * rowSize + z] = rowBuf[z]
    }
  }
  return buffer
}

function convertFontObj (options) {
  font.first = Math.min.apply(null, font.glyphs.map(g => g.encoding))
  font.last = Math.max.apply(null, font.glyphs.map(g => g.encoding))
  font.width = Math.max.apply(null, font.glyphs.map(g => g.width))
  font.height = Math.max.apply(null, font.glyphs.map(g => g.height))
  font.advanceX = font.width
  font.advanceY = font.height
  var output = []

  function _hex (val) {
    var v = val.toString(16)
    if (v.length === 1) {
      return '0x0' + v
    } else {
      return '0x' + v
    }
  }

  output.push('module.exports = {')
  output.push('  bitmap: new Uint8Array([')
  for (var i = 0; i < font.glyphs.length; i++) {
    let glyph = font.glyphs[i]
    let values = Array.from(glyph.bitmap)
    output.push('    ' + values.map(v => _hex(v)).join(', ') + (i < font.glyphs.length - 1 ? ',' : '') + ` // '${glyph.encoding}'`)
    // for (let j = 0; j < glyph.bitmap.length; j++) {
    // }
  }
  output.push('  ]).buffer,')
  if (options.widthVar) {
    output.push('  glyphs: new Uint8Array([')
    for (let i = 0; i < font.glyphs.length; i++) {
      let glyph = font.glyphs[i]
      glyph.advanceX = glyph.width + 1
      output.push(`    ${_hex(glyph.width)}, ${_hex(glyph.height)}, ${_hex(glyph.advanceX)}` + (i < font.glyphs.length - 1 ? ',' : '') + ` // ${glyph.encoding}`)
    }
    output.push('  ]).buffer,')
  }
  output.push(`  width: ${font.width},`)
  output.push(`  height: ${font.height},`)
  output.push(`  first: ${font.first},`)
  output.push(`  last: ${font.last},`)
  output.push(`  advanceX: ${font.advanceX},`)
  output.push(`  advanceY: ${font.advanceY}`)
  output.push('}')
  output.push('')
  return output.join('\n')
}

exports.convert = function (source, target, options) {
  var bdf = fs.readFileSync(source, 'utf8')
  lines = bdf.split('\n')
  readFont()
  var converted = convertFontObj(options)
  fs.writeFileSync(target, converted, 'utf8')
}
