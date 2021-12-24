export interface AbortableFetch {
    abort: Function,
    ready: Function
}

export function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController()
    const { signal } = controller

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal })
    }
}