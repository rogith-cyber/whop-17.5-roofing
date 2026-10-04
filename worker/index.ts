import {
  handleWhopApi,
  inputErrorResponse,
  parseWhopBody,
  type WhopBindings,
} from '../server/whopService'

interface Env extends WhopBindings {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const apiRoutes = new Set([
  '/api/leads',
  '/api/setup-intents',
  '/api/setup-intents/status',
  '/api/invoices',
])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (!apiRoutes.has(pathname)) {
      if (pathname.startsWith('/api/')) return Response.json({ error: 'Not found.' }, { status: 404 })
      return env.ASSETS.fetch(request)
    }
    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed.' },
        { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } },
      )
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return Response.json(
        { error: 'Content-Type must be application/json.' },
        { status: 415, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    try {
      const body = await parseWhopBody(request)
      return handleWhopApi(pathname, body, env)
    } catch (error) {
      return inputErrorResponse(error)
    }
  },
} satisfies ExportedHandler<Env>
