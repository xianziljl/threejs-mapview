import { MapProvider } from './MapProvider'
import { loadImage } from '../../utils/image'
import { ImageLoader, Texture, TextureLoader } from 'three'
import { MapView } from '../MapView'

const textureLoader = new TextureLoader()
const imageLoader = new ImageLoader()

interface MapTileItem {
    tile_id: string,
    blob: Blob
}



export class MapboxProvider extends MapProvider {
    public apiToken: string = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw'
    public mapId: string // mapbox.terrain-rgb mapbox.satellite
    public format: string // png png32 png64 png128 png256 jpg70 jpg80 jpg90 pngraw
    public mapView: MapView
    public db: IDBDatabase

    constructor(mapId: string, format: string, mapView: MapView) {
        super()
        this.mapId = mapId
        this.format = format
        this.mapView = mapView
        // console.log('init db:', mapId)
        // this.initDB()
        setTimeout(() => {
            mapView.onReady()
        }, 10);
    }

    public getUrl(level: number, x: number, y: number): string {
        return `https://api.mapbox.com/v4/${this.mapId}/${level}/${x}/${y}.${this.format}?access_token=${this.apiToken}`
    }

    public fetchTile(level: number, x: number, y: number): Promise<HTMLImageElement> {
        // const id = `${zoom}-${x}-${y}-${this.format}`
        return new Promise(async (resolve, reject) => {
            const url = this.getUrl(level, x, y)

            // const tileId = `${level}_${x}_${y}`

            try {
                // let blob: Blob

                // const tile = await this.getTileFromeDB(tileId).catch(e => null)
                // if (tile) {
                //     blob = tile.blob
                // } else {
                //     blob = await this.fetchTileFromServe(url).catch(e => null)
                //     // if (blob) {
                //     //     this.addToDB(tileId, blob)
                //     // }
                // }

                // if (!blob) {
                //     return reject()
                // }

                // const _url = URL.createObjectURL(blob)
                const img = document.createElement('img')
                img.crossOrigin = 'Anymouse'
                img.onload = () => {
                    resolve(img)
                }
                img.onerror = () => {
                    reject()
                }
                img.src = url
            } catch (e) {
                reject()
            }
        })
    }

    public async fetchTileFromServe(url: string): Promise<Blob> {
        const req = new Request(url)
        const res = await fetch(req)
        const blob = await res.blob()
        return blob
    }

    public async getTileFromeDB(tile_id: string): Promise<MapTileItem> {
        return new Promise((resolve, reject) => {
            const { db } = this
            const request = db.transaction(['tiles'])
                .objectStore('tiles')
                .get(tile_id)

            request.onsuccess = e => {
                // console.log('get from db success')
                if (request.result) {
                    resolve(request.result)
                } else {
                    reject()
                }
            }

            request.onerror = e => {
                console.log('get from db error')
                reject()
            }
        })
    }

    public addToDB(tile_id: string, blob?: Blob) {
        const { db } = this

        const request = db.transaction(['tiles'], 'readwrite')
            .objectStore('tiles')
            .add({ tile_id, blob })

        request.onsuccess = e => {
            // console.log('add to db success')
        }

        request.onerror = e => {
            console.warn('add to db failed')
        }
    }

    public initDB() {
        const { mapId } = this
        const request = window.indexedDB.open(`mapbox.tile.${mapId}`)

        request.onerror = e => {
            console.log('Open indexedDB error.')
        }
        request.onsuccess = e => {
            console.log('Open indexedDB success.')
            // @ts-ignore 
            const db: IDBDatabase = e.target.result
            // init(db)
            this.db = db
            this.mapView.onReady()

        }
        request.addEventListener('upgradeneeded', e => {
            
        })
        request.onupgradeneeded = e => {
            console.log('onupgradeneeded')
            // @ts-ignore 
            const db: IDBDatabase = e.target.result
            if (!db.objectStoreNames.contains('tiles')) {
                db.createObjectStore('tiles', { keyPath: 'tile_id', autoIncrement: false })
            }
        }
    }
}