import { MapProvider } from './MapProvider'
import { Color } from 'three'
import { getCanvas } from '../../utils/image'

const white = new Color(0xcccccc)

export class DebugProvider extends MapProvider {

	public resolution: number = 256

	public fetchTile(level: number, x: number, y: number): Promise<any> {
        const { resolution, minLevel, maxLevel } = this

		const canvas = getCanvas(resolution, resolution)
		const context = canvas.getContext('2d')

		const black = new Color(0x222222)

		const color = black.lerpHSL(white, (level - minLevel) / (maxLevel - minLevel))

		context.fillStyle = color.getStyle()
		context.strokeStyle = '#00ffff'
		context.fillRect(0, 0, resolution, resolution)
		context.strokeRect(0, 0, resolution, resolution)

		context.fillStyle = '#00ffff'
		context.textAlign = 'left'
		context.textBaseline = 'middle'
		context.font = 'bold ' + resolution * 0.1 + 'px arial'
		context.fillText(`z: ${level}`, resolution / 4, resolution * 0.3)
		context.fillText(`x: ${x}`, resolution / 4, resolution * 0.5)
		context.fillText(`y: ${y}`, resolution / 4, resolution * 0.7)

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(canvas)
			}, Math.random() * 1000)
		})
	}
}
