import { MapView } from '../MapView'
import { MapProvider } from './MapProvider'
import { AbortableFetch, abortableFetch } from '../../utils/fetch'

export class LocalProvider extends MapProvider {
    public type: number = 0
    constructor(type: number, mapView: MapView) {
        super()
        this.type = type
        setTimeout(() => {
            mapView.onReady()
        }, 10)
    }

    public getUrl(level: number, x: number, y: number): string {
        return `http://localhost:3001/${level}/${x}/${y}/${this.type}`
    }

    public fetchTile(level: number, x: number, y: number): AbortableFetch {

        const url = this.getUrl(level, x, y)

        return abortableFetch(url)
    }
}