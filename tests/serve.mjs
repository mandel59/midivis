import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const root = resolve('public')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
        const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
        if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return }
        const body = await readFile(file)
        response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body)
    } catch { response.writeHead(404).end() }
}).listen(4173, '127.0.0.1')
