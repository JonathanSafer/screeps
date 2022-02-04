import commonjs from '@rollup/plugin-commonjs';

export default {
      input: 'built/main.js',
      output: {
              dir: 'dist',
              format: 'cjs',
              exports: 'named'
            },
      plugins: [commonjs({
        ignoreGlobal: false,
        ignore: ["conditional-runtime-dependency"],
      })]
};