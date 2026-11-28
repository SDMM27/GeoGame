// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'

import handler from '../api/csp-report.mjs'

const origin = 'https://preview.example.test'
const endpoint = origin + '/api/csp-report'

function post(body, contentType = 'application/reports+json') {
  return handler.fetch(new Request(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))
}

afterEach(() => vi.restoreAllMocks())

it('records only fixed categories from legacy browser reports', async () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const response = await post({
    'csp-report': {
      'document-uri': origin + '/player/private-uid?token=secret',
      'blocked-uri': 'https://fonts.googleapis.com/css?family=example',
      'effective-directive': 'style-src-elem',
      'script-sample': 'private text',
    },
  }, 'application/csp-report; charset=utf-8')

  expect(response.status).toBe(204)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(info).toHaveBeenCalledTimes(1)
  expect(info).toHaveBeenCalledWith('[csp-report]',
    '[{"directive":"style-src-elem","document":"player","resource":"fonts.googleapis.com"}]')
})

it('accepts Reporting API batches and discards unrelated and unrecognized reports', async () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const response = await post([
    null,
    { type: 'deprecation' },
    { type: 'csp-violation', body: { effectiveDirective: 'sensitive-value' } },
    {
      type: 'csp-violation',
      body: {
        documentURL: origin + '/multiplayer/room/private-code#secret',
        blockedURL: 'https://private-subdomain.example.test/secret',
        effectiveDirective: 'connect-src',
      },
    },
  ])

  expect(response.status).toBe(204)
  expect(info).toHaveBeenCalledTimes(1)
  expect(info).toHaveBeenCalledWith('[csp-report]',
    '[{"directive":"connect-src","document":"room","resource":"other"}]')
})

it('rejects unsupported methods, unsupported media, invalid JSON and oversized bodies', async () => {
  const response = await handler.fetch(new Request(endpoint))
  expect(response.status).toBe(405)
  expect(response.headers.get('allow')).toBe('POST')
  expect((await post({}, 'application/json')).status).toBe(415)
  expect((await post('{')).status).toBe(400)
  expect((await post('x'.repeat(16385))).status).toBe(413)
})
