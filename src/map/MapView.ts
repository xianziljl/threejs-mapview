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
    provider: MapProvider = new MapboxProvider('mapbox.satellite', 'jpg70')
    heightProvider: MapProvider = new MapboxProvider('mapbox.terrain-rgb', 'pngraw')
    // provider: MapProvider = new MapboxProvider('mapbox.terrain-rgb', 'pngraw')
    root: MapNode
    

    constructor() {
        super()
        // const root = new MapTestNode(null, this, 0, 0, 0, 0)
        const root = new MapHeightNode(null, this, 0, 0, 0, 0)
        this.root = root
        this.add(root)
        this.scale.copy(new Vector3(EARTH_PERIMETER, 1, EARTH_PERIMETER))
    }

    update(camera: MapCamera):void {
        const { root } = this
        root.updateFromCamera(camera)
        // root.subdivide()
    }
}