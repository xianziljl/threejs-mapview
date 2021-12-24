import { Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, PlaneBufferGeometry, Vector2, Vector3 } from 'three'
import { MapProvider } from './providers/MapProvider'
import { DebugProvider } from './providers/DebugProvider'
import { MapboxProvider } from './providers/MapboxProvider'
import { MapNode } from './nodes/MapNode'
import { EARTH_PERIMETER } from '../utils/unit'
import { MapCamera } from './MapCamera'
import { MapHeightNode } from './nodes/MapHeightNode'
import { LocalProvider } from './providers/LocalProvider'

export class MapView extends Object3D {
    provider: MapProvider = null
    heightProvider: MapProvider = null
    root: MapNode
    readyState: number = 0
    

    constructor() {
        super()
        const geo = new PlaneBufferGeometry()
        const mtl = new MeshBasicMaterial({ color: 0x000000 })
        const plane = new Mesh(geo, mtl)
        plane.rotateX(-Math.PI / 2)
        plane.position.y = -1000
        this.add(plane)
        
        const scale = new Vector3(EARTH_PERIMETER, 1, EARTH_PERIMETER)
        this.scale.copy(scale)
        
        // this.provider = new MapboxProvider('mapbox.satellite', 'jpg70', this)
        this.provider = new LocalProvider(0, this)
        // this.heightProvider = new MapboxProvider('mapbox.terrain-rgb', 'pngraw', this)
        this.heightProvider = new LocalProvider(1, this)
    }

    onReady() {
        this.readyState++
        if (this.readyState !== 2) return
        // console.log(this)
        const root = new MapHeightNode(null, this, 0, 0, 0, 0)
        this.root = root
        this.add(root)
        root.initialize()
    }

    update(camera: MapCamera):void {
        const { root } = this
        if (!root) return
        root.updateFromCamera(camera)
        // root.subdivide()
    }
}