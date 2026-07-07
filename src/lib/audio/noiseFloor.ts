export interface NoiseFloorOptions {
  blockSec?: number
  numBlocks?: number
  floorMax?: number
}

const BLOCK_SEC = 0.75
const NUM_BLOCKS = 3
const FLOOR_MAX = 0.02

/**
 * Adaptive ambient-noise estimator: a sliding-block minimum of frame RMS.
 * Steady noise (mains hum, fans, hiss) has no gaps, so the floor converges to
 * its level within one to numBlocks blocks; notes are transient, so the
 * inter-note gaps inside any lookback window keep the floor at ambient while
 * the user plays. The floor is 0 until the first block completes, so startup
 * behavior matches a fixed gate. Pure logic — no DOM/audio types.
 */
export class NoiseFloor {
  private blockSec: number
  private numBlocks: number
  private floorMax: number

  private blockStart: number | null = null
  private blockMin = Infinity
  private completed: number[] = []

  constructor(opts: NoiseFloorOptions = {}) {
    this.blockSec = opts.blockSec ?? BLOCK_SEC
    this.numBlocks = opts.numBlocks ?? NUM_BLOCKS
    this.floorMax = opts.floorMax ?? FLOOR_MAX
  }

  /** Min RMS over completed blocks, clamped; 0 until the first block completes. */
  get floor(): number {
    if (this.completed.length === 0) return 0
    return Math.min(Math.min(...this.completed), this.floorMax)
  }

  update(rms: number, t: number): void {
    // Time going backwards means the clock restarted — start over.
    if (this.blockStart !== null && t < this.blockStart) this.reset()
    if (this.blockStart === null) {
      this.blockStart = t
      this.blockMin = rms
      return
    }
    if (t - this.blockStart >= this.blockSec) {
      // Close the current block (a forward t jump, e.g. after demo playback
      // muted the mic, just closes it late — its minimum is still ambient).
      this.completed.push(this.blockMin)
      if (this.completed.length > this.numBlocks) this.completed.shift()
      this.blockStart = t
      this.blockMin = rms
    } else {
      this.blockMin = Math.min(this.blockMin, rms)
    }
  }

  reset(): void {
    this.blockStart = null
    this.blockMin = Infinity
    this.completed = []
  }
}
