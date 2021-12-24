export abstract class MapProvider {
    public name: string = ''
    public minLevel: number = 0
    public maxLevel: number = 20
    public bounds: number[] = []
    public center: number[] = []
    public tileSize: number = 256

    public getUrl(level: number, x: number, y: number): string {
        return null
    }

    public fetchTile(level: number, x: number, y: number): any {
        return null
    }
    public getMetaData(): void {}
}
