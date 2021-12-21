import { Object3D } from 'three'

export const emptyObj = new Object3D()

export function getObjectsByType(objects: Object3D[], type: string): Set<Object3D> {
    const res = new Set<Object3D>()
    function each(objs: Object3D[]) {
        objs.forEach(obj => {
            if (obj.type === type) {
                res.add(obj)
            } else {
                each(obj.children)
            }
        })
    }
    each(objects)
    return res
}