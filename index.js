var path = require('path');
var fs = require('fs');
const minifier = require('html-minifier').minify,
  webpackSources = require('webpack-sources');

var regex = /(\n?)([ \t]*)(<!--\s*replace:(\w+(?:-\w+)*)\s*-->)\n?([\s\S]*?)\n?(<!--\s*endreplace\s*-->)\n?/ig;

function regexMatchAll(string, regexp) {
  var matches = [];
  string.replace(regexp, function () {
    var arr = Array.prototype.slice.call(arguments);
    matches.push(arr);
  });
  return matches;
}

function minify(content) {
  content = content instanceof Buffer ? content.toString('utf8') : content;
  try {
    return minifier(content, {
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      decodeEntities: true,
      minifyCSS: true,
      minifyJS: true,
      removeAttributeQuotes: true,
      removeComments: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    });
  } catch (e) {
    console.warn(path);
    return content;
  }
};

function Replace(config) {
  this.skip = config.skip || false;
  this.entry = config.entry;
  this.output = config.output;
  this.data = config.data;
  this.hash = config.hash;
  this.hashValue = config.hashValue;
  this.replaceWithAssets = config.replaceWithAssets || [];
  this.isMin = config.min;
}

Replace.prototype.apply = function (compiler) {
  var self = this;
  var folder = compiler.options.context;
  var entry = path.join(folder, self.entry);
  let fileName = this.output || path.basename(this.entry);

  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('additional-assets', (callback) => {
      try {
        let data = fs.readFileSync(entry, 'utf8');
        if (!self.skip) {
          var matches = regexMatchAll(data, regex);
          matches.forEach(function (match) {
            var str = match[0];
            var key = match[4];
            if (key in self.data) data = data.replace(str, '\n' + self.data[key] + '\n');
          });
        }

        if (self.hash) {
          var changeWith = typeof self.hashValue === 'string' ? self.hashValue : compilation.hash,
            assetsKeys = Object.keys(compilation.assets);

          self.replaceWithAssets.forEach(it => {
            let reg;
            for(let i = assetsKeys.length; i--;){
              reg = new RegExp(it.assetReg);
              if(reg.test(assetsKeys[i])){
                reg = new RegExp('\\' + it.search, 'g');
                data = data.replace(reg, assetsKeys[i]);
                break;
              }
            }
          });
          var reg = new RegExp('\\' + self.hash, 'g');

          data = data.replace(reg, changeWith);
        }

        if (self.isMin) data = minify(data);
        compilation.assets[fileName] = new webpackSources.RawSource(data);
      } catch (err) {
        console.error(err);
      }

      callback();

    });
  });
};

module.exports = Replace;
