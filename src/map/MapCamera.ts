import { Camera, Frustum, Matrix4, PerspectiveCamera } from 'three'

const  computeFrustumFromCamera = (frustum: Frustum, camera: Camera) => {
    const matrix4 = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix4)
}


export class MapCamera extends PerspectiveCamera {
    public frustum: Frustum = new Frustum()

    constructor() {
        super(65, window.innerWidth / window.innerHeight, 1, 1e12)
        this.position.set(0, 1e8 / 10, 0);
        this.lookAt(0, 0, 0)
        this.update()
    }

    public update (): void {
        computeFrustumFromCamera(this.frustum, this)
    }
}