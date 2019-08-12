# Kameleon Font Converter

Convert GBDF (Glyph Bitmap Distribution Format) `.bdf` to Kameleon's font object `.js`.


- [Raster Font Editor v0.14](https://www.cylog.org/graphics/rasterfonteditor.jsp) - Good raster font editor for Windows.
  - GBDF Format exported by Raster Font Editor (v0.14) has error in bitmap ordering.


```sh
$ kameleon-fontconv my-font.bdf # generate my-font.js
$ kameleon-fontconv my-font.bdf -o new-font.js
$ kameleon-fontconv my-font.bdf --width-var
```
