import { Mesh, MeshBasicMaterial, PlaneBufferGeometry, RepeatWrapping, TextureLoader } from 'three'

export class Ground extends Mesh {
    constructor(size = 32768) {
        const geo = new PlaneBufferGeometry(size, size)
        const texture = new TextureLoader().load('/assets/grid.png')
        texture.wrapS = texture.wrapT = RepeatWrapping
        const repeat = size / 100
        texture.repeat.set(repeat, repeat)
        const mtl = new MeshBasicMaterial({
            color: 0x161618,
            map: texture
        })
        super(geo, mtl)
    }
}