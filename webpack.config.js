const path = require('path');

module.exports = [{
    entry: './_js/index.js',
    mode: 'production',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'assets/js'),
    },
},
{
    entry: './_sass/style.scss',
    mode: 'production',
    output: {
        filename: 'style.js',
        path: path.resolve(__dirname, 'assets/css'),
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'style.css',
                        },
                    },
                    { loader: 'extract-loader' },
                    { loader: 'css-loader' },
                    {
                        loader: 'sass-loader',
                        options: {
                            // Prefer Dart Sass
                            implementation: require('sass'),
                            webpackImporter: false,
                            sassOptions: {
                              includePaths: ['./node_modules']
                            },
                        },
                    },
                ]
            }
        ]
    },
}];