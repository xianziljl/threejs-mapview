import {
    AmbientLight,
    AxesHelper,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    Vector3,
    Vector2,
    Raycaster,
    Object3D,
    Clock,
    LOD,
    DirectionalLight,
    FogExp2,
    Fog
} from 'three'
import { MapControls } from 'three/examples/jsm/controls/OrbitControls'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { getObjectsByType } from '../utils/object'
import { Ground } from './Ground'
import { Sky } from './Sky'

const MAX_Y = 1500

export class HiScene extends Scene {
    // render
    camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000)
    renderer = new WebGLRenderer({ antialias: false, logarithmicDepthBuffer: true })
    css2DRenderer = new CSS2DRenderer()
    outlinePass = new OutlinePass(new Vector2(window.innerWidth, window.innerHeight), this, this.camera)
    // bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
    composer = new EffectComposer(this.renderer)
    // controls
    controls = new MapControls(this.camera, this.renderer.domElement)
    // objects
    ground = new Ground()
    // fog = new FogExp2(0x2d3f50, 0.0025)
    fog = new Fog(0x2d3f50, 0, 8000)
    sky = new Sky()
    sun = new Vector3()
    // mouse hover
    focusObject: Object3D
    // time
    clock = new Clock(true)
    isDark = true

    constructor() {
        super()
        const { camera, renderer, css2DRenderer, ground, sky, controls, outlinePass, composer } = this

        console.log('this.raycast:', this.raycast)

        // 相机
        camera.position.x = 150
        camera.position.y = 150
        camera.position.z = -50
        this.add(camera)
        // 合成器
        const renderPass = new RenderPass(this, camera)
        renderer.autoClear = false
        composer.addPass(renderPass)
        outlinePass.edgeStrength = 4
        outlinePass.edgeGlow = 0
        const fxaaPass = new ShaderPass(FXAAShader)
        fxaaPass.enabled = true
        composer.addPass(fxaaPass)
        composer.addPass(outlinePass)
        // 地面
        ground.rotation.x = -Math.PI / 2
        ground.renderOrder = 0
        // ground.layers
        this.add(ground)
        // 天空
        // sky.night = false
        this.add(sky)
        // 环境光
        const ambientLight = new AmbientLight(0xffffff, 0.5)
        this.add(ambientLight)
        const dirLight = new DirectionalLight(0xffffff, 3)
        dirLight.position.set(-50, 200, -1000)
        dirLight.lookAt(0, 0, 0)
        this.add(dirLight)
        // 坐标轴指示器
        // const axesHelper = new AxesHelper(10)
        // axesHelper.position.y = 10
        // this.add(axesHelper)
        // 控制器
        controls.maxPolarAngle = Math.PI / 2.02
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.screenSpacePanning = false
        controls.minDistance = 5
        controls.maxDistance = MAX_Y
        controls.autoRotateSpeed = -0.3
        controls.autoRotate = false
        controls.addEventListener('change', () => {
            // const distance = controls.getDistance()
            // this.fog.density = (MAX_Y - distance) / MAX_Y * 0.002
            this.css2DRenderer.render(this, camera)
        })

        const mousePos = new Vector2()
        const raycaster = new Raycaster()
        const onPointerMove = (event: PointerEvent) => {
            if (event.isPrimary === false) return
            // 鼠标移上的物体高亮
            const { innerWidth: w, innerHeight: h } = window
            mousePos.x = (event.clientX / w) * 2 - 1
            mousePos.y = - (event.clientY / h) * 2 + 1
            raycaster.setFromCamera(mousePos, camera)
            const intersects = raycaster.intersectObject(this, true)
            if (intersects.length) {
                const hoverObject = intersects[0]?.object
                if (hoverObject?.userData.hoverOutline) {
                    this.outlinePass.selectedObjects = [hoverObject]
                } else {
                    this.outlinePass.selectedObjects = []
                }
            }
        }
        renderer.domElement.addEventListener('pointermove', onPointerMove)
        document.body.appendChild(renderer.domElement)
        css2DRenderer.domElement.style.position = 'absolute'
        css2DRenderer.domElement.style.pointerEvents = 'none'
        css2DRenderer.domElement.style.top = '0'
        document.body.appendChild(css2DRenderer.domElement)

        const resize = () => {
            const { innerWidth: w, innerHeight: h } = window
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
            renderer.setPixelRatio(window.devicePixelRatio)
            css2DRenderer.setSize(w, h)
            outlinePass.setSize(w, h)
            composer.setSize(w, h)
        }
        window.addEventListener('resize', resize)
        resize()

        console.log(this)
        this.addTest()
    }

    get dark() {
        return true
    }
    set dark(dark: boolean) {
        
    }

    addTest() {
        // const geo = new PlaneBufferGeometry(10000, 40)
        // const mtl = new MeshLambertMaterial({ color: 0x20242d })
        // const mesh = new Mesh(geo, mtl)
        // mesh.rotation.x = -Math.PI / 2
        // mesh.position.y = 1
        // mesh.renderOrder = 1
        // mesh.userData.hoverOutline = true
        // this.add(mesh)

        // const geo1 = new PlaneBufferGeometry(10000, 5000)
        // const mtl1 = new MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.5 })
        // const mesh1 = new Mesh(geo1, mtl1)
        // mesh1.rotation.x = -Math.PI / 2
        // mesh1.position.y = 20
        // mesh1.position.z = -2560
        // this.add(mesh1)

        // const { composer, outlinePass } = this
        // outlinePass.selectedObjects = [mesh]
    }

    render() {
        this.controls.update()
        this.composer.render()
    }
}