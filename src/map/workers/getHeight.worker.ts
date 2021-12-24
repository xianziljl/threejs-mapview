
// https://github.com/mapbox/martini/blob/master/index.js

class Martini {
    gridSize: number
    numTriangles: number
    numParentTriangles: number
    indices: Uint32Array
    coords: Uint16Array
    constructor(gridSize = 257) {
        this.gridSize = gridSize
        const tileSize = gridSize - 1
        if (tileSize & (tileSize - 1)) throw new Error(
            `Expected grid size to be 2^n+1, got ${gridSize}.`)

        this.numTriangles = tileSize * tileSize * 2 - 2
        this.numParentTriangles = this.numTriangles - tileSize * tileSize

        this.indices = new Uint32Array(this.gridSize * this.gridSize)

        // coordinates for all possible triangles in an RTIN tile
        // 为锡瓦上的所有可能的三角形坐标
        this.coords = new Uint16Array(this.numTriangles * 4)

        // get triangle coordinates from its index in an implicit binary tree
        // 从隐式二叉树的索引中获取三角形坐标
        for (let i = 0; i < this.numTriangles; i++) {
            let id = i + 2
            let ax = 0, ay = 0, bx = 0, by = 0, cx = 0, cy = 0
            if (id & 1) {
                bx = by = cx = tileSize // bottom-left triangle
            } else {
                ax = ay = cy = tileSize // top-right triangle
            }
            while ((id >>= 1) > 1) {
                const mx = (ax + bx) >> 1
                const my = (ay + by) >> 1

                if (id & 1) { // left half
                    bx = ax; by = ay
                    ax = cx; ay = cy
                } else { // right half
                    ax = bx; ay = by
                    bx = cx; by = cy
                }
                cx = mx; cy = my
            }
            const k = i * 4
            this.coords[k + 0] = ax
            this.coords[k + 1] = ay
            this.coords[k + 2] = bx
            this.coords[k + 3] = by
        }
    }

    createTile(terrain: Float32Array) {
        return new Tile(terrain, this)
    }
}

class Tile {
    terrain: any
    martini: any
    errors: Float32Array
    constructor(terrain: Float32Array, martini: Martini) {
        const size = martini.gridSize
        if (terrain.length !== size * size) throw new Error(
            `Expected terrain data of length ${size * size} (${size} x ${size}), got ${terrain.length}.`)

        this.terrain = terrain
        this.martini = martini
        this.errors = new Float32Array(terrain.length)
        this.update()
    }

    update() {
        const { numTriangles, numParentTriangles, coords, gridSize: size } = this.martini
        const { terrain, errors } = this

        // iterate over all possible triangles, starting from the smallest level
        // 从最小级别开始迭代所有可能的三角形
        for (let i = numTriangles - 1; i >= 0; i--) {
            const k = i * 4
            const ax = coords[k + 0]
            const ay = coords[k + 1]
            const bx = coords[k + 2]
            const by = coords[k + 3]
            const mx = (ax + bx) >> 1
            const my = (ay + by) >> 1
            const cx = mx + my - ay
            const cy = my + ax - mx

            // calculate error in the middle of the long edge of the triangle
            // 计算三角形长边的中间的误差
            const interpolatedHeight = (terrain[ay * size + ax] + terrain[by * size + bx]) / 2
            const middleIndex = my * size + mx
            const middleError = Math.abs(interpolatedHeight - terrain[middleIndex])

            errors[middleIndex] = Math.max(errors[middleIndex], middleError)

            if (i < numParentTriangles) { // bigger triangles; accumulate error with children 较大的三角形;用孩子累积错误
                const leftChildIndex = ((ay + cy) >> 1) * size + ((ax + cx) >> 1)
                const rightChildIndex = ((by + cy) >> 1) * size + ((bx + cx) >> 1)
                errors[middleIndex] = Math.max(errors[middleIndex], errors[leftChildIndex], errors[rightChildIndex])
            }
        }
    }

    getMesh(maxError = 0) {
        const { gridSize: size, indices } = this.martini
        const { errors } = this
        let numVertices = 0
        let numTriangles = 0
        const max = size - 1

        // use an index grid to keep track of vertices that were already used to avoid duplication
        // 使用索引网格来跟踪已用于避免重复的顶点
        indices.fill(0)

        // retrieve mesh in two stages that both traverse the error map:
        // 在两个阶段检索网格，两阶段都遍历错误映射：
        // - countElements: find used vertices (and assign each an index), and count triangles (for minimum allocation)
        // - countElements: 查找使用的顶点（并分配每个索引），并计算三角形（用于最小分配）
        // - processTriangle: fill the allocated vertices & triangles typed arrays
        // - processTriangle: 填充分配的顶点和三角形类型阵列

        function countElements(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
            const mx = (ax + bx) >> 1
            const my = (ay + by) >> 1

            if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1 && errors[my * size + mx] > maxError) {
                countElements(cx, cy, ax, ay, mx, my)
                countElements(bx, by, cx, cy, mx, my)
            } else {
                indices[ay * size + ax] = indices[ay * size + ax] || ++numVertices
                indices[by * size + bx] = indices[by * size + bx] || ++numVertices
                indices[cy * size + cx] = indices[cy * size + cx] || ++numVertices
                numTriangles++
            }
        }
        countElements(0, 0, max, max, max, 0)
        countElements(max, max, 0, 0, 0, max)

        const vertices = new Uint16Array(numVertices * 2)
        const triangles = new Uint32Array(numTriangles * 3)
        let triIndex = 0

        function processTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
            const mx = (ax + bx) >> 1
            const my = (ay + by) >> 1

            if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1 && errors[my * size + mx] > maxError) {
                // triangle doesn't approximate the surface well enough; drill down further
                processTriangle(cx, cy, ax, ay, mx, my)
                processTriangle(bx, by, cx, cy, mx, my)

            } else {
                // add a triangle
                const a = indices[ay * size + ax] - 1
                const b = indices[by * size + bx] - 1
                const c = indices[cy * size + cx] - 1

                vertices[2 * a] = ax
                vertices[2 * a + 1] = ay

                vertices[2 * b] = bx
                vertices[2 * b + 1] = by

                vertices[2 * c] = cx
                vertices[2 * c + 1] = cy

                triangles[triIndex++] = a
                triangles[triIndex++] = b
                triangles[triIndex++] = c
            }
        }
        processTriangle(0, 0, max, max, max, 0)
        processTriangle(max, max, 0, 0, 0, max)

        return { vertices, triangles }
    }
}

const martini = new Martini()
const BOUNDS = [-0.5, -0.5, 0.5, 0.5]

function imgDataToTerrain(imgData: ImageData, tileSize: number): Float32Array {
    const gridSize = tileSize + 1
    const terrain = new Float32Array(gridSize * gridSize)

    // 解码地形值
    for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
            const k = (y * tileSize + x) * 4
            const r = imgData.data[k + 0]
            const g = imgData.data[k + 1]
            const b = imgData.data[k + 2]
            terrain[y * gridSize + x] = (r * 256 * 256 + g * 256 + b) / 10 - 10000
        }
    }
    // 回填右边和底部边界
    for (let x = 0; x < gridSize - 1; x++) {
        terrain[gridSize * (gridSize - 1) + x] = terrain[gridSize * (gridSize - 2) + x]
    }
    for (let y = 0; y < gridSize; y++) {
        terrain[gridSize * y + gridSize - 1] = terrain[gridSize * y + gridSize - 2]
    }

    return terrain
}

function getMeshAttributes(vertices: Uint16Array, terrain: Float32Array, tileSize: number, bounds: number[], exageration: number = 1): { position: { value: Float32Array, size: number }, uv: { value: Float32Array, size: number } } // NORMAL: {}, - optional, but creates the high poly look with lighting}
{
    const gridSize = tileSize + 1
    const numOfVerticies = vertices.length / 2

    // vec3. x, y in pixels, z in meters
    const positions = new Float32Array(numOfVerticies * 3)

    // vec2. 1 to 1 relationship with position. represents the uv on the texture image. 0,0 to 1,1.
    const texCoords = new Float32Array(numOfVerticies * 2)

    const [minX, minY, maxX, maxY] = bounds || [0, 0, tileSize, tileSize]
    const xScale = (maxX - minX) / tileSize
    const yScale = (maxY - minY) / tileSize

    for (let i = 0; i < numOfVerticies; i++) {
        const x = vertices[i * 2]
        const y = vertices[i * 2 + 1]
        const pixelIdx = y * gridSize + x

        positions[3 * i + 0] = x * xScale + minX
        positions[3 * i + 1] = -terrain[pixelIdx] * exageration
        positions[3 * i + 2] = -y * yScale + maxY

        texCoords[2 * i + 0] = x / tileSize
        texCoords[2 * i + 1] = (tileSize - y) / tileSize
    }

    return {
        position: { value: positions, size: 3 },
        uv: { value: texCoords, size: 2 }
    }
}

function buildSkirt(width: number = 1.0, height: number = 1.0, widthSegments: number = 1.0, heightSegments: number = 1.0, skirtDepth: number, indices: number[], vertices: number[], normals: number[], uvs: number[]): void {
    // Half width X 
    const widthHalf = width / 2

    // Half width Z
    const heightHalf = height / 2

    // Size of the grid in X
    const gridX = widthSegments + 1

    // Size of the grid in Z
    const gridZ = heightSegments + 1

    // Width of each segment X
    const segmentWidth = width / widthSegments

    // Height of each segment Z
    const segmentHeight = height / heightSegments

    let start = vertices.length / 3

    // Down X
    for (let ix = 0; ix < gridX; ix++) {
        const x = ix * segmentWidth - widthHalf
        const z = -heightHalf

        vertices.push(x, -skirtDepth, z)
        normals.push(0, 1, 0)
        uvs.push(ix / widthSegments, 1)
    }

    // Indices
    for (let ix = 0; ix < widthSegments; ix++) {
        const a = ix
        const d = ix + 1
        const b = ix + start
        const c = ix + start + 1
        indices.push(d, b, a, d, c, b)
    }

    start = vertices.length / 3

    // Up X
    for (let ix = 0; ix < gridX; ix++) {
        const x = ix * segmentWidth - widthHalf
        const z = heightSegments * segmentHeight - heightHalf

        vertices.push(x, -skirtDepth, z)
        normals.push(0, 1, 0)
        uvs.push(ix / widthSegments, 0)
    }

    // Index of the beginning of the last X row
    let offset = gridX * gridZ - widthSegments - 1

    for (let ix = 0; ix < widthSegments; ix++) {
        const a = offset + ix
        const d = offset + ix + 1
        const b = ix + start
        const c = ix + start + 1
        indices.push(a, b, d, b, c, d)
    }

    start = vertices.length / 3

    // Down Z
    for (let iz = 0; iz < gridZ; iz++) {
        const z = iz * segmentHeight - heightHalf
        const x = - widthHalf

        vertices.push(x, -skirtDepth, z)
        normals.push(0, 1, 0)
        uvs.push(0, 1 - iz / heightSegments)
    }

    for (let iz = 0; iz < heightSegments; iz++) {
        const a = iz * gridZ
        const d = (iz + 1) * gridZ
        const b = iz + start
        const c = iz + start + 1

        indices.push(a, b, d, b, c, d)
    }

    start = vertices.length / 3

    // Up Z
    for (let iz = 0; iz < gridZ; iz++) {
        const z = iz * segmentHeight - heightHalf
        const x = widthSegments * segmentWidth - widthHalf

        vertices.push(x, -skirtDepth, z)
        normals.push(0, 1, 0)

        uvs.push(1.0, 1 - iz / heightSegments)
    }

    for (let iz = 0; iz < heightSegments; iz++) {
        const a = iz * gridZ + heightSegments
        const d = (iz + 1) * gridZ + heightSegments
        const b = iz + start
        const c = iz + start + 1

        indices.push(d, b, a, d, c, b)
    }
}
interface AbortableFetch {
    abort: Function,
    ready: () => Promise<Response>
}

function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController()
    const { signal } = controller

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal })
    }
}

interface MessageData {
    nodeId: string
    imgUrl?: string,
    errorNum?: number,
    cancel?: boolean
}

const canvas = new OffscreenCanvas(256, 256)
const cxt = canvas.getContext('2d')

const requests = new Map<string, AbortableFetch>([])

self.onmessage = async (e: MessageEvent<MessageData>) => {
    const { nodeId, imgUrl, errorNum, cancel } = e.data
    try {
        if (cancel) {
            const req = requests.get(nodeId)
            if (req) req.abort()
            requests.delete(nodeId)
            return
        }
        const request = abortableFetch(imgUrl)
        requests.set(nodeId, request)
        const res = await request.ready()
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        cxt.drawImage(bitmap, 0, 0, 256, 256)
        const imgData = cxt.getImageData(0, 0, 256, 256)
        const terrain = imgDataToTerrain(imgData, 256)
        const tile = martini.createTile(terrain)
        const { vertices, triangles } = tile.getMesh(errorNum)
        const { position, uv } = getMeshAttributes(vertices, terrain, 256, BOUNDS)

        const transferableObjects = [
            triangles,
            position.value,
            uv.value
        ]

        self.postMessage({ nodeId, triangles, position, uv }, null, transferableObjects)
        requests.delete(nodeId)
    } catch (e) {
        requests.delete(nodeId)
        self.postMessage({ nodeId, error: true })
    }
}