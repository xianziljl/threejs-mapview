import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three'
import Martini from '../../libs/Matrtini'

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

interface MessageData {
    nodeId: string
    imgData: ImageData,
    bitmap: ImageBitmap,
    errorNum: number
}

const canvas = new OffscreenCanvas(256, 256)
const cxt = canvas.getContext('2d')


self.onmessage = (e: MessageEvent<MessageData>) => {
    const { nodeId, bitmap, errorNum } = e.data
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
}