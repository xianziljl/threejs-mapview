import { AmbientLight, BoxBufferGeometry, Color, Fog, FogExp2, LinearFilter, Mesh, MeshBasicMaterial, MeshNormalMaterial, NearestFilter, PerspectiveCamera, Scene, SphereGeometry, UnsignedByteType, WebGLRenderer } from 'three'
import { MapControls } from 'three/examples/jsm/controls/OrbitControls'
import { MapView } from './map/MapView'
import { MapCamera } from './map/MapCamera'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import { RendererStats } from './libs/threex.rendererstats'
import { Sky } from './scene/Sky'
import { MapHeightNode } from './map/nodes/MapHeightNode'


const scene = new Scene()
const camera = new MapCamera()
const renderer = new WebGLRenderer({
    logarithmicDepthBuffer: true, // 场景尺寸比例较大且有面重合的情况下需要打开
    antialias: true
})
const controls = new MapControls(camera, renderer.domElement)
const stats = new (Stats as any)()
const rendererStats = new (RendererStats as any)()
const sky = new Sky()
scene.add(sky)

// const fog = new FogExp2(0xadcbff, 0.0000001)
const fog = new Fog(0xdfffff, 0, 1e8)
scene.fog = fog

renderer.sortObjects = false

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)
document.body.appendChild(stats.dom)
document.body.appendChild(rendererStats.domElement)
rendererStats.domElement.style.position = 'absolute'
rendererStats.domElement.style.width = '130px'
rendererStats.domElement.style.top = '50px'

controls.maxPolarAngle = Math.PI / 2.02
controls.enableDamping = true
controls.dampingFactor = 0.1
controls.screenSpacePanning = false
controls.minDistance = 5
controls.maxDistance = 1e7
controls.autoRotateSpeed = -0.3
controls.autoRotate = false

const ambientLight = new AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)


// const renderer2 = new WebGLRenderer({ antialias: false })
// const camera2 = new PerspectiveCamera(80, 400 / 400, 1, 1e10)
// camera2.position.y = 24000000
// camera2.lookAt(0, 0, 0)
// renderer2.domElement.style.position = 'absolute'
// renderer2.domElement.style.left = '0'
// renderer2.domElement.style.bottom = '0'
// renderer2.domElement.style.top = 'auto'
// renderer2.domElement.style.border = '1px solid red'
// document.body.appendChild(renderer2.domElement)
// renderer2.setSize(400, 400)

const geometry = new BoxBufferGeometry(100000, 1000000, 100000, 1, 1, 1)
const material = new MeshBasicMaterial({ color: 0xffff00 })
const cube = new Mesh(geometry, material)
cube.position.set(-20037508.342789244, 500000, -20037508.342789244)
scene.add(cube)


// init skybox
// const hdrUrls = [ 'cc_c00.hdr', 'cc_c01.hdr', 'cc_c02.hdr', 'cc_c03.hdr', 'cc_c04.hdr', 'cc_c05.hdr' ]
// const hdrCubeMap = new HDRCubeTextureLoader()
//     .setPath('/assets/sky/')
//     .setDataType(UnsignedByteType)
//     .load(hdrUrls, () => {
//         hdrCubeMap.magFilter = NearestFilter
//         hdrCubeMap.needsUpdate = true
//     })
// scene.background = new Color(0xadcbff)


// init mapbox
const mapView = new MapView()
scene.add(mapView)

mapView.update(camera)
controls.addEventListener('change', () => {
    // 动态改变相机远裁平面
    camera.far = controls.getDistance() * 40
    camera.updateProjectionMatrix()
    camera.update()
    // console.log('controls.center:', controls.center)
    // fog.far = camera.far
})

window.addEventListener('resize', () => {
    const { innerWidth: w, innerHeight: h, devicePixelRatio } = window
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    renderer.setPixelRatio(devicePixelRatio)
})

// console.log('mapView:', mapView)



let i = 0
function animate() {
    requestAnimationFrame(animate)
    controls.update()
    if (i === 10) {
        mapView.update(camera)
        i = 0
    }
    // fog.density = 0.03 / camera.position.y
    let far = camera.position.y * 50
    // console.log('far:', far)
    fog.far = far < 100000 ? 100000 : far
    renderer.render(scene, camera)
    // renderer2.render(scene, camera2)
    stats.update()
    rendererStats.update(renderer)
    i++
}
animate()

