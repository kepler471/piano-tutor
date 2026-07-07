import { describe, expect, it } from 'vitest'
import { buildHash, parseRoute } from '../lib/routing'

describe('parseRoute', () => {
  it('maps an empty hash to the home path', () => {
    expect(parseRoute('')).toEqual({ path: '/', params: {} })
    expect(parseRoute('#')).toEqual({ path: '/', params: {} })
  })

  it('returns bare paths untouched', () => {
    expect(parseRoute('#/scales')).toEqual({ path: '/scales', params: {} })
    expect(parseRoute('/practice')).toEqual({ path: '/practice', params: {} })
  })

  it('splits off query params', () => {
    expect(parseRoute('#/practice?lesson=scale-C-major')).toEqual({
      path: '/practice',
      params: { lesson: 'scale-C-major' },
    })
    expect(parseRoute('/ear?mode=intervals&level=2')).toEqual({
      path: '/ear',
      params: { mode: 'intervals', level: '2' },
    })
  })

  it('decodes encoded keys and values', () => {
    expect(parseRoute('/scales?root=F%23&type=harmonic%20minor').params).toEqual({
      root: 'F#',
      type: 'harmonic minor',
    })
  })

  it('tolerates empty and valueless pairs', () => {
    expect(parseRoute('/x?&a=1&flag').params).toEqual({ a: '1', flag: '' })
  })
})

describe('buildHash', () => {
  it('omits the query when there are no params', () => {
    expect(buildHash('/scales')).toBe('/scales')
    expect(buildHash('/scales', {})).toBe('/scales')
  })

  it('encodes params', () => {
    expect(buildHash('/scales', { root: 'F#', type: 'harmonic minor' })).toBe(
      '/scales?root=F%23&type=harmonic%20minor',
    )
  })

  it('round-trips through parseRoute', () => {
    const params = { lesson: 'scale-Bb-major', extra: 'a b&c=d' }
    expect(parseRoute(buildHash('/practice', params))).toEqual({ path: '/practice', params })
  })
})
