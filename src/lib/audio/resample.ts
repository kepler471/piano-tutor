/**
 * Streaming linear resampler. Basic Pitch expects 22050 Hz mono; the mic
 * AudioContext usually runs at 44.1/48 kHz. Linear interpolation is plenty for
 * pitch detection (we only care about content below ~4 kHz).
 */
export class Resampler {
  private ratio: number
  /** fractional read position in input samples, relative to current chunk start */
  private pos = 0
  /** last sample of the previous chunk, for interpolation across boundaries */
  private prev = 0
  private hasPrev = false

  constructor(fromRate: number, private toRate: number) {
    this.ratio = fromRate / toRate
  }

  push(chunk: Float32Array): Float32Array<ArrayBuffer> {
    const out: number[] = []
    while (this.pos < chunk.length) {
      const i = Math.floor(this.pos)
      const frac = this.pos - i
      const s0 = i === -1 ? (this.hasPrev ? this.prev : chunk[0]) : chunk[i]
      const s1 = i + 1 < chunk.length ? chunk[i + 1] : chunk[chunk.length - 1]
      out.push(s0 + (s1 - s0) * frac)
      this.pos += this.ratio
    }
    this.pos -= chunk.length
    this.prev = chunk[chunk.length - 1]
    this.hasPrev = true
    return Float32Array.from(out)
  }
}
