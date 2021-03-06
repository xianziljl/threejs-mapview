import typescript from 'rollup-plugin-typescript'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/dist.esm.js',
    format: 'esm'
  },
  plugins: [
    typescript({ target: 'ES2015' })
  ]
}