# Kameleon Font Converter

A command-line tool to convert [GBDF (Glyph Bitmap Distribution Format)](https://en.wikipedia.org/wiki/Glyph_Bitmap_Distribution_Format) `.bdf` to Kameleon font object `.js`.

## Install

```sh
$ npm install -g kameleon-fontconv
```

## Usage

```sh
$ kameleon-fontconv -h  # see help
$ kameleon-fontconv my-font.bdf  # generate my-font.js
$ kameleon-fontconv my-font.bdf -t font.js  # change target filename
$ kameleon-fontconv my-font.bdf --width-var  # generate variable-width font
$ kameleon-fontconv my-font.bdf --use-array  # generate data as array
```

The generated font object can be used by calling `GraphicContext.setFont()`.

## Editor for custom font

[Raster Font Editor v0.14](https://www.cylog.org/graphics/rasterfonteditor.jsp) - Good raster font editor for Windows.
- GBDF Format exported by Raster Font Editor (v0.14) has error in bitmap ordering.
- `kameleon-fontconv` detects font generator name and version in GBDF format, and fix the bitmap ordering problem automatically.
