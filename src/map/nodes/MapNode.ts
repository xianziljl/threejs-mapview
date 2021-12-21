import { Geometry } from 'geojson'
import { Box3Helper, BoxBufferGeometry, BufferGeometry, Camera, Color, Event, Material, Mesh, MeshBasicMaterial, Object3D, Texture, Vector3 } from 'three'
import { MapCamera } from '../MapCamera'
import { MapView } from '../MapView'
import { OBB } from 'three/examples/jsm/math/OBB'

type MapNodeConstructor = {
    new(parentNode: MapNode, mapView: MapView, location: number, level: number, x: number, y: number): MapNode
}

const BOX_HELPER_COLOR = new Color(0xffff00)

const NODE_POSITION = new Vector3()

const NODE_PORITIONS = [
    [-0.25, 0, -0.25],
    [0.25, 0, -0.25],
    [-0.25, 0, 0.25],
    [0.25, 0, 0.25]
]

export class MapNode extends Mesh {
    public parentNode: MapNode
    public mapView: MapView
    public location: number // 0: left-top, 1: right-top, 2: left-bottom, 3: right-bottom
    public level: number
    public x: number
    public y: number
    public nodeId: string // level-x-y

    public loadedChilds: number = 0 // 已加载的子节点数
    public subdivided: boolean = false

    public children: MapNode[] = []
    public geometry: BufferGeometry
    public material: Material
    public texture: Texture
    
    // public obb: OBB = new OBB()

    // @ts-ignore
    public isMesh: boolean = true
    // public isInView: boolean = false

    public constructor(parentNode: MapNode = null, mapView: MapView = null, location = -1, level = 0, x = 0, y = 0) {
        super()
        this.visible = !parentNode
        this.parentNode = parentNode
        this.mapView = mapView
        this.location = location
        this.level = level
        this.x = x
        this.y = y
        this.nodeId = level + '-' + x + '-' + y
        this.matrixAutoUpdate = false
        this.userData.isMapNode = true

        this.initialize()
    }

    public initialize(): void {}

    public subdivide(): void {
        const { mapView, children, level, isMesh } = this

        if (!isMesh || children.length || level >= mapView.provider.maxLevel) {
            return
        }
        // create children nodes
        const Constructor = Object.getPrototypeOf(this).constructor as MapNodeConstructor
        const _l = this.level + 1
        const _x = this.x * 2
        const _y = this.y * 2
        let i = 0
        this.loadedChilds = 0
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 2; x++) {
                const node = new Constructor(this, this.mapView, i, _l, _x + x, _y + y)
                node.scale.set(0.5, 1.0, 0.5)
                const locationArr = NODE_PORITIONS[i]
                node.position.set(locationArr[0], locationArr[1], locationArr[2])
                this.add(node)
                node.updateMatrix()
                node.updateMatrixWorld(true)
                i++
            }
        }
        this.subdivided = true
    }

    public simplify(): void {
        this.subdivided = false
        this.children.forEach(child => {
            this.remove(child)
            child.dispose()
        })
        this.loadedChilds = 0
        this.isMesh = true
        this.children = []
    }

    public updateFromCamera(camera: MapCamera): void {
        const { frustum } = camera
        const { level, mapView, geometry, isMesh } = this
        const position = this.getWorldPosition(NODE_POSITION)
        
        let distance = camera.position.distanceTo(position)
        distance /= Math.pow(2, mapView.provider.maxLevel - level)

        const isInFrustum = geometry.boundingBox && frustum.intersectsBox(geometry.boundingBox)
        // const isInFrustum = frustum.intersectsObject(this)
        // this.isInView = isInFrustum

        // this.visible = distance < 1000
        
        if (distance < 120) {
            if (isInFrustum) this.subdivide()
        } else {
            this.simplify()
        }
        this.children.forEach(child => (child as MapNode).updateFromCamera(camera))
    }

    public onReady(): void {

        const { parentNode, geometry, subdivided } = this
        geometry.computeBoundingBox()
        geometry.boundingBox.applyMatrix4(this.matrixWorld)

        if (!parentNode) return

        parentNode.loadedChilds += 1
        if (parentNode.loadedChilds < 4) return

        parentNode.isMesh = false
        parentNode.children.forEach(child => child.visible = true)
        // parentNode.onReady()
        
    }

    public dispose(): void {
        const { children, geometry, material, texture } = this
        
        // console.log('dispose')
        children.forEach(child => child.dispose())
        geometry && geometry.dispose()
        material && material.dispose()
        texture && texture.dispose()
        this.subdivided = false
    }
}