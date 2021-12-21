import { BackSide, BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, MeshNormalMaterial, NearestFilter, PlaneBufferGeometry, RGBFormat, Texture, Uint32BufferAttribute } from 'three'
import Martini from '../../libs/Matrtini'
import { getCanvas, getImageData, imgDataToTerrain } from '../../utils/image'
import { MapView } from '../MapView'
import { MapNode } from './MapNode'

const BASIC_MATERIAL = new MeshBasicMaterial()
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


export class MapHeightNode extends MapNode {
    public static debug = false
    public static martini = new Martini()
    public static canvas = getCanvas(256, 256)
    public static worker = new Worker('../workers/getHeight.worker.ts', { type: 'module' })

    public heightLoaded = false
    public textureLoaded = false

    constructor(parentNode: MapNode = null, mapView: MapView = null, location = -1, level = 0, x = 0, y = 0) {
        super(parentNode, mapView, location, level, x, y)
    }

    public initialize(): void {
        super.initialize()
        this.loadHeightGeometry()
        this.loadTexture()
    }

    public loadHeightGeometry(): void {
        const { parentNode, mapView, level, x, y, nodeId } = this
        // const imgUrl = mapView.heightProvider.getUrl(level, x, y)

        let img: HTMLImageElement
        mapView.heightProvider.fetchTile(level, x, y).then((image: HTMLImageElement) => {
            img = image
        }).finally(() => {
            if (parentNode && !parentNode.subdivided) {
                this.dispose()
                return
            }
            if (!img) {
                this.geometry = PLANE_GEOMETRY.clone()
                this.heightLoaded = true
                this.onComplate()
                return
            }

            const { worker } = MapHeightNode
            const onMessage = (e: MessageEvent<WorkerData>) => {
                if (e.data.nodeId === this.nodeId) {
                    worker.removeEventListener('message', onMessage)
                    
                    const { triangles, position, uv } = e.data
                    const geometry = new BufferGeometry()
                    geometry.setIndex(new Uint32BufferAttribute(triangles, 1))
                    geometry.setAttribute('position', new Float32BufferAttribute(position.value, position.size))
                    geometry.setAttribute('uv', new Float32BufferAttribute(uv.value, uv.size))
                    geometry.rotateX(Math.PI)
                    geometry.computeVertexNormals()
                    this.geometry = geometry
                    this.heightLoaded = true
                    this.onComplate()
                    // console.timeEnd(this.nodeId)
                }
            }
            worker.addEventListener('message', onMessage)

            const maxLevel = mapView.heightProvider.maxLevel
            const errorNum = level < 10 ? 100 : (maxLevel - level) / maxLevel * 80

            createImageBitmap(img, 0, 0, img.width, img.height).then(bitmap => {
                worker.postMessage({ nodeId, bitmap, errorNum })
            })
        })
    }

    public loadTexture() {
        const { parentNode, mapView, level, x, y } = this
        let img: HTMLImageElement | HTMLCanvasElement
        mapView.provider.fetchTile(level, x, y).then((image: HTMLImageElement) => {
            img = image
        }).catch(e => {
            img = document.createElement('img')
        }).finally(() => {
            if (parentNode && !parentNode.subdivided) {
                this.dispose()
                return
            }
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
                texture = new Texture(canvas as HTMLCanvasElement)
            } else {
                texture = new Texture(img)
            }
            texture.generateMipmaps = false
            texture.format = RGBFormat
            // texture.magFilter = NearestFilter
            // texture.minFilter = NearestFilter
            texture.needsUpdate = true
            material.map = texture
            this.texture = texture
            this.material = material
            this.textureLoaded = true
            this.onComplate()
        })

        // setTimeout(() => {
        //     this.material = NORMAL_MATERIAL
        //     this.textureLoaded = true
        //     this.onComplate()
        // })
    }

    public onComplate() {
        if (!this.heightLoaded || !this.textureLoaded) return
        this.onReady()
    }
}