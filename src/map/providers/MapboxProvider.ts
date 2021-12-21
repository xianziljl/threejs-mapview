import { MapProvider } from './MapProvider'
import { loadImage } from '../../utils/image'
import { ImageLoader, Texture, TextureLoader } from 'three'

const textureLoader = new TextureLoader()
const imageLoader = new ImageLoader()



export class MapboxProvider extends MapProvider {
    public apiToken: string = 'pk.eyJ1IjoidGVudG9uZSIsImEiOiJjazBwNHU4eDQwZzE4M2VzOGhibWY5NXo5In0.8xpF1DEcT6Y4000vNhjj1g'
    public mapId: string // mapbox.terrain-rgb mapbox.satellite
    public format: string // png png32 png64 png128 png256 jpg70 jpg80 jpg90 pngraw
    public db: IDBDatabase

    constructor(mapId: string, format: string) {
        super()
        this.mapId = mapId
        this.format = format

        // // init indexdb
        // const request = window.indexedDB.open('mapbox_tile')
        // request.onerror = e => {
        //     console.log('Open indexedDB error.')
        // }
        // request.onsuccess = e => {
        //     console.log('Open indexedDB success.')
        // }
        // request.onupgradeneeded = e => {
        //     // @ts-ignore
        //     const db: IDBDatabase = e.target.result
        //     if (!db.objectStoreNames.contains(mapId)) {
        //         const objectStore = db.createObjectStore(mapId, { keyPath: 'id' })
        //         objectStore.createIndex('id', 'id', { unique: true })
        //     }
        //     this.db = db
        // }
    }

    public getUrl(level: number, x: number, y: number): string {
        return `https://api.mapbox.com/v4/${this.mapId}/${level}/${x}/${y}.${this.format}?access_token=${this.apiToken}`
    }

    public fetchTile(level: number, x: number, y: number): Promise<HTMLImageElement> {
        // const id = `${zoom}-${x}-${y}-${this.format}`
        const url = this.getUrl(level, x, y)
        
        return new Promise((resolve, reject) => {
            imageLoader.load(url, img => resolve(img), null, e => reject())
        })
    }
}