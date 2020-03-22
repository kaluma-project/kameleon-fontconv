const fs = require('fs')

var lines = []
var index = 0
var createdByRasterFontEditor = false
var globalOptions = {}

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
    }
    if (l[0] === 'STARTCHAR') {
      readChar(l)
    }
    if (l[0] === 'FONTBOUNDINGBOX') {
      font.width = l[1] * 1
      font.height = l[2] * 1
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

  if (globalOptions.widthVar) {
    let mw = 0
    let mh = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (matrix[y][x]) {
          mh = Math.max(mh, y)
          mw = Math.max(mw, x)
        }
      }
    }
    glyph.width = mw + 1
    glyph.height = mh + 1
  }

  font.glyphs.push(glyph)
}

function readLine () {
  var l = lines[index].trim()
  index++
  return l.split(' ')
}

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

function convertFontObj () {
  font.first = Math.min.apply(null, font.glyphs.map(g => g.encoding))
  font.last = Math.max.apply(null, font.glyphs.map(g => g.encoding))
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
  if (globalOptions.useArray) {
    output.push('  bitmap: new Uint8Array([')
    for (let i = 0; i < font.glyphs.length; i++) {
      let glyph = font.glyphs[i]
      let values = Array.from(glyph.bitmap)
      output.push('    ' + values.map(v => _hex(v)).join(', ') + (i < font.glyphs.length - 1 ? ',' : '') + ` // '${glyph.encoding}'`)
    }
    output.push('  ]).buffer,')
  } else {
    let total = font.glyphs.reduce((a, g) => a + g.bitmap.length, 0)
    let buffer = Buffer.alloc(total)
    let pos = 0
    for (let i = 0; i < font.glyphs.length; i++) {
      for (let j = 0; j < font.glyphs[i].bitmap.length; j++) {
        buffer[pos] = font.glyphs[i].bitmap[j]
        pos++
      }
    }
    output.push(`  bitmap: atob("${buffer.toString('base64')}"),`)
  }
  if (globalOptions.widthVar) {
    // Set space (0x20) glyph's width and height to width and height of 'B'
    var glyphSpace = font.glyphs.find(g => g.encoding === 32)
    var glyphB = font.glyphs.find(g => g.encoding === 66)
    glyphSpace.width = glyphB.width
    glyphSpace.height = glyphB.height
    if (globalOptions.useArray) {
      output.push('  glyphs: new Uint8Array([')
      for (let i = 0; i < font.glyphs.length; i++) {
        let glyph = font.glyphs[i]
        glyph.advanceX = glyph.width + 1
        output.push(`    ${_hex(glyph.width)}, ${_hex(glyph.height)}, ${_hex(glyph.advanceX)}` + (i < font.glyphs.length - 1 ? ',' : '') + ` // ${glyph.encoding}`)
      }
      output.push('  ]).buffer,')
    } else {
      let buffer = new Buffer.alloc(font.glyphs.length * 3)
      let pos = 0
      for (let i = 0; i < font.glyphs.length; i++) {
        let glyph = font.glyphs[i]
        glyph.advanceX = glyph.width + 1
        buffer[pos] = glyph.width
        buffer[pos + 1] = glyph.height
        buffer[pos + 2] = glyph.advanceX
        pos = pos + 3
      }
      output.push(`  glyphs: atob("${buffer.toString('base64')}"),`)
    }
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
  globalOptions = options || {}
  var bdf = fs.readFileSync(source, 'utf8')
  lines = bdf.split('\n')
  readFont()
  var converted = convertFontObj()
  fs.writeFileSync(target, converted, 'utf8')
}
