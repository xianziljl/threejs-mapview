export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img')
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
            resolve(img)
        }
        img.onerror = () => {
            reject()
        }
        img.src = url
    })
}

export function getCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
    if (OffscreenCanvas) {
        return new OffscreenCanvas(width, height)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}

export function getImageData(img: HTMLImageElement, context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): ImageData {
    const { width, height } = img
    const cxt = context || getCanvas(width, height).getContext('2d')
    cxt.imageSmoothingEnabled = false
    cxt.drawImage(img, 0, 0, width, height)
    return cxt.getImageData(0, 0, width, height)
}


// let canvasContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
export function imgDataToTerrain(imgData: ImageData, tileSize: number): Float32Array {

    const gridSize = tileSize + 1
    const terrain = new Float32Array(gridSize * gridSize);

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