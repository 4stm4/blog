const path = require('path');

function tryResolve_(url, sourceFilename) {
  // Put require.resolve in a try/catch to avoid node-sass failing with cryptic libsass errors
  // when the importer throws
  try {
    return require.resolve(url, {paths: [path.dirname(sourceFilename)]});
  } catch (e) {
    return '';
  }
}

function tryResolveScss(url, sourceFilename) {
  // Support omission of .scss and leading _
  const normalizedUrl = url.endsWith('.scss') ? url : `${url}.scss`;
  return tryResolve_(normalizedUrl, sourceFilename) ||
    tryResolve_(path.join(path.dirname(normalizedUrl), `_${path.basename(normalizedUrl)}`),
      sourceFilename);
}

function materialImporter(url, prev) {
  if (url.startsWith('@material')) {
    const resolved = tryResolveScss(url, prev);
    return {file: resolved || url};
  }
  return {file: url};
}

module.exports = [{
  entry: './_assets/js/index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
},
{
    entry: './_assets/scss/app.scss',
    mode: 'production',
    output: {
      // This is necessary for webpack to compile
      // But we never use style-bundle.js
      filename: 'style-bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            {
      
            
              loader: 'sass-loader',
              options: {   
                // Prefer Dart Sass
                implementation: require('sass'),
           
                // See https://github.com/webpack-contrib/sass-loader/issues/804
                webpackImporter: false,
                sassOptions: {
                  importer: materialImporter,
                  includePaths: ['./node_modules'],
                },
              },
            }
          ]
        }
      ]
    },
  }];
