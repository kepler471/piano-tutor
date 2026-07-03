// @ts-nocheck — AudioWorkletGlobalScope globals (registerProcessor,
// AudioWorkletProcessor) are not in the main-thread TS lib.
/**
 * Accumulates render quanta (128 frames) into 2048-sample hops and posts them
 * to the main thread. Plain JS with no imports so bundlers never touch it.
 */
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048)
    this.filled = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true
    let offset = 0
    while (offset < channel.length) {
      const take = Math.min(channel.length - offset, this.buffer.length - this.filled)
      this.buffer.set(channel.subarray(offset, offset + take), this.filled)
      this.filled += take
      offset += take
      if (this.filled === this.buffer.length) {
        const out = this.buffer
        this.port.postMessage(out, [out.buffer])
        this.buffer = new Float32Array(2048)
        this.filled = 0
      }
    }
    return true
  }
}

registerProcessor('capture-processor', CaptureProcessor)
