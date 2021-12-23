import { Object3D, PerspectiveCamera, Vector3 } from 'three'
import { MapProvider } from './providers/MapProvider'
import { DebugProvider } from './providers/DebugProvider'
import { MapboxProvider } from './providers/MapboxProvider'
import { MapNode } from './nodes/MapNode'
import { EARTH_PERIMETER } from '../utils/unit'
import { MapCamera } from './MapCamera'
import { MapHeightNode } from './nodes/MapHeightNode'

export class MapView extends Object3D {
    // provider: MapProvider = new DebugProvider()
    provider: MapProvider
    heightProvider: MapProvider
    // provider: MapProvider = new MapboxProvider('mapbox.terrain-rgb', 'pngraw')
    root: MapNode
    readyState: number = 0
    

    constructor() {
        super()
        // const root = new MapTestNode(null, this, 0, 0, 0, 0)
        this.scale.copy(new Vector3(EARTH_PERIMETER, 1, EARTH_PERIMETER))
        this.provider = new MapboxProvider('mapbox.satellite', 'jpg70', this.onReady.bind(this))
        this.heightProvider = new MapboxProvider('mapbox.terrain-rgb', 'pngraw', this.onReady.bind(this))
    }

    onReady() {
        this.readyState++
        if (this.readyState !== 2) return
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