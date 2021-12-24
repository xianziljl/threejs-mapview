import { BufferGeometry, Float32BufferAttribute, Matrix4, MeshBasicMaterial, MeshNormalMaterial, PlaneBufferGeometry, RGBFormat, Texture, Uint32BufferAttribute } from 'three'
import { AbortableFetch } from '../../utils/fetch'
import { getCanvas } from '../../utils/image'
import { MapView } from '../MapView'
import { MapNode } from './MapNode'

const BASIC_MATERIAL = new MeshBasicMaterial({

})
const NORMAL_MATERIAL = new MeshNormalMaterial({ flatShading: true })
// const NORMAL_MATERIAL = new MeshBasicMaterial({ wireframe: true, color: 0xaaaaaa })
const PLANE_GEOMETRY = new PlaneBufferGeometry()
const rotation = new Matrix4().makeRotationX(-Math.PI / 2)
PLANE_GEOMETRY.applyMatrix4(rotation)

const BOUNDS = [-0.5, -0.5, 0.5, 0.5]


interface WorkerData {
    nodeId: string,
    vertices: Uint16Array,
    triangles: Uint32Array,
    position: { value: Float32Array, size: number },
    uv: { value: Float32Array, size: number },
    // index: Uint32BufferAttribute,
    // position: Float32BufferAttribute,
    // uv: Float32BufferAttribute
}

// const 

export class MapHeightNode extends MapNode {
    public static debug = false
    public static canvas = getCanvas(256, 256)
    public static workers = []
    public static maxWorker = 3
    public static workerIndex = 0

    public geometryState: number = 0 // 0: nothing, 1: 加载完成， 2: 加载并解析完成.
    public textureState: number = 0 // 0: nothing, 1: 加载完成， 2: 加载并解析完成.
    public requests: AbortableFetch[] = []

    constructor(parentNode: MapNode = null, mapView: MapView = null, location = -1, level = 0, x = 0, y = 0) {
        super(parentNode, mapView, location, level, x, y)
    }

    public initialize(): void {
        super.initialize()
        if (this.geometryState === 0) this.loadHeightGeometry()
        if (this.textureState === 0) this.loadTexture()
    }

    public async loadHeightGeometry() {
        const { mapView, level, x, y, nodeId } = this

        const request = mapView.heightProvider.fetchTile(level, x, y)
        this.requests.push(request)

        const res = await request.ready()
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const img = document.createElement('img')
        img.onerror = () => {
            console.log('load height error:', nodeId)
            this.geometry = PLANE_GEOMETRY.clone()
            this.geometryState = 2
            this.onComplate()
        }
        img.onload = async () => {
            this.geometryState = 1
            const worker = MapHeightNode.getWorker()

            const onMessage = (e: MessageEvent<WorkerData>) => {
                if (e.data.nodeId === this.nodeId) {
                    worker.removeEventListener('message', onMessage)

                    const { triangles, position, uv } = e.data
                    const geometry = new BufferGeometry()
                    geometry.setIndex(new Uint32BufferAttribute(triangles, 1))
                    geometry.setAttribute('position', new Float32BufferAttribute(position.value, position.size))
                    geometry.setAttribute('uv', new Float32BufferAttribute(uv.value, uv.size))
                    geometry.rotateX(Math.PI)
                    // geometry.computeVertexNormals()
                    this.geometry = geometry
                    this.geometryState = 2
                    this.onComplate()
                }
            }
            worker.addEventListener('message', onMessage)

            // const maxLevel = mapView.heightProvider.maxLevel
            // const errorNum = level < 10 ? 100 : (maxLevel - level) / maxLevel * 80

            const bitmap = await createImageBitmap(img, 0, 0, img.width, img.height)
            worker.postMessage({ nodeId, bitmap, errorNum: 100 }, [bitmap])
        }
        img.src = url
    }

    public async loadTexture() {
        const { mapView, level, x, y } = this
        const request = mapView.provider.fetchTile(level, x, y)
        this.requests.push(request)

        const res = await request.ready()
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const img = document.createElement('img')
        img.onerror = () => {
            console.log('load texture error:', this.nodeId)
            // const canvas = getCanvas(1, 1)
            // const cxt = canvas.getContext('2d')
            // cxt.fillStyle = 'green'
            // cxt.fillRect(0, 0, 1, 1)
            // this.texture = new Texture(canvas as HTMLCanvasElement)
        }
        img.onload = () => {
            this.textureState = 1
            const material = BASIC_MATERIAL.clone()
            let texture: Texture
            if (MapHeightNode.debug) {
                const canvas = getCanvas(img.width, img.height)
                const cxt = canvas.getContext('2d')
                cxt.drawImage(img, 0, 0, img.width, img.height)
                cxt.strokeStyle = '#00ffff'
                cxt.fillStyle = '#00ffff'
                cxt.font = 'bold 20px arial'
                cxt.strokeRect(0, 0, canvas.width, canvas.height)
                cxt.fillText(level + '', 20, 20)
                cxt.fillStyle = '#ffff00'
                cxt.fillText(x + '', 20, 40)
                cxt.fillStyle = '#ff0000'
                cxt.fillText(y + '', 20, 60)
                texture = new Texture(canvas as HTMLCanvasElement)
            } else {
                texture = new Texture(img as HTMLImageElement)
            }
            // texture.generateMipmaps = false
            // texture.format = RGBFormat
            // texture.magFilter = NearestFilter
            // texture.minFilter = NearestFilter
            texture.needsUpdate = true
            material.map = texture
            material.needsUpdate = true
            this.texture = texture
            this.material = material
            this.textureState = 2
            this.onComplate()
        }
        img.src = url
    }

    public onComplate() {
        if (this.geometryState === 2 && this.textureState === 2) {
            this.onReady()
        }
    }

    public static getWorker() {
        const { workers, maxWorker } = MapHeightNode
        if (MapHeightNode.workerIndex === maxWorker) {
            MapHeightNode.workerIndex = 0
        }
        let worker: Worker = workers[MapHeightNode.workerIndex]
        if (!worker) {
            console.log('create new worker.')
            worker = new Worker('../workers/getHeight.worker.ts')
            workers.push(worker)
        }
        MapHeightNode.workerIndex++
        return worker
    }

    public dispose(): void {
        this.requests.forEach(req => req.abort())
        this.requests = []
        super.dispose()
    }
}