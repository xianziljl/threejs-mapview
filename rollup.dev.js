import typescript from 'rollup-plugin-typescript'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import copy from 'rollup-plugin-copy'
import OMT from '@surma/rollup-plugin-off-main-thread'
// import workerLoader from 'rollup-plugin-web-worker-loader'
// import alias from '@rollup/plugin-alias';


const THREE = 'libs/three'

export default {
    input: 'src/index.ts',
    output: {
        dir: 'public',
        format: 'esm',
        paths: id => {
            if (id === 'three') {
                return `./${THREE}/build/three.module.js`
            }
            if (/^three\//.test(id)) {
                return './' + id.replace(/^three/, THREE) + '.js'
            }
        }
    },
    plugins: [
        OMT(),
        typescript({ target: 'ES6' }),
        copy({
            targets: [
                { src: 'src/assets', dest: 'public' }
            ]
        }),
        serve({
            contentBase: 'public',
			verbose: true,
            port: 3000,
        }),
        livereload({watch: ['src', 'public']})
    ],
    external: id => /^three/.test(id),
}