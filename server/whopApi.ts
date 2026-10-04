import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import { handleWhopApi } from './whopService.js'

const maxBodyBytes = 16_384
const routes = new Set(['/api/leads', '/api/setup-intents', '/api/setup-intents/status', '/api/invoices'])

function send(res: ServerResponse, status: number, body: string) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBodyBytes) throw new Error('Request is too large.')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  const body: unknown = JSON.parse(raw)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request body.')
  return body as Record<string, unknown>
}

export function whopApi(): Plugin {
  return {
    name: 'northline-whop-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!routes.has(url.pathname)) {
          next()
          return
        }
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          send(res, 405, JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        if (!req.headers['content-type']?.includes('application/json')) {
          send(res, 415, JSON.stringify({ error: 'Content-Type must be application/json.' }))
          return
        }
        try {
          const body = await readBody(req)
          const result = await handleWhopApi(url.pathname, body, process.env)
          send(res, result.status, await result.text())
        } catch (error) {
          if (error instanceof SyntaxError || (error instanceof Error && (error.message === 'Request is too large.' || error.message === 'Invalid request body.'))) {
            send(res, 400, JSON.stringify({ error: error.message }))
            return
          }
          console.error(`[whop-api] ${url.pathname}`, error)
          send(res, 500, JSON.stringify({ error: 'Unable to process this Whop request.' }))
        }
      })
    },
  }
}
