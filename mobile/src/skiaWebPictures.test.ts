import { releaseReplacedPictures } from './skiaWebPictures'

const picture = () => ({ dispose: jest.fn() })

function makeApi() {
  const shown: Record<string, unknown> = {}
  return {
    shown,
    deferedPictures: {} as Record<string, { dispose: jest.Mock } | undefined>,
    setJsiProperty(nativeId: number | string, name: string, value: unknown) {
      if (name === 'picture') shown[String(nativeId)] = value
    },
  }
}

describe('releaseReplacedPictures', () => {
  it("deletes a view's previous picture once a new one is shown", () => {
    const api = makeApi()
    releaseReplacedPictures(api)
    const first = picture()
    const second = picture()
    api.setJsiProperty(1, 'picture', first)
    expect(first.dispose).not.toHaveBeenCalled()
    api.setJsiProperty(1, 'picture', second)
    expect(api.shown['1']).toBe(second)
    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second.dispose).not.toHaveBeenCalled()
  })

  it('keeps the pictures of other views and a picture shown again', () => {
    const api = makeApi()
    releaseReplacedPictures(api)
    const a = picture()
    const b = picture()
    api.setJsiProperty(1, 'picture', a)
    api.setJsiProperty(2, 'picture', b)
    api.setJsiProperty(1, 'picture', a)
    expect(a.dispose).not.toHaveBeenCalled()
    expect(b.dispose).not.toHaveBeenCalled()
  })

  it('drops a deleted picture still waiting for its view', () => {
    const api = makeApi()
    releaseReplacedPictures(api)
    const first = picture()
    api.setJsiProperty(3, 'picture', first)
    api.deferedPictures['3'] = first
    api.setJsiProperty(3, 'picture', picture())
    expect(api.deferedPictures['3']).toBeUndefined()
  })

  it('wraps the API only once', () => {
    const api = makeApi()
    releaseReplacedPictures(api)
    const wrapped = api.setJsiProperty
    releaseReplacedPictures(api)
    expect(api.setJsiProperty).toBe(wrapped)
  })
})
