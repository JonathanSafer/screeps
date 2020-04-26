import commonjs from '@rollup/plugin-commonjs';

export default {
      input: 'src/main.js',
      output: {
              dir: 'dist',
              format: 'cjs'
            },
      plugins: [commonjs({
        ignoreGlobal: false,
        ignore: ["conditional-runtime-dependency"] ,
      })]
};
