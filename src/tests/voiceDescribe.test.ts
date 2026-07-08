import { describe, expect, it } from 'vitest'
import { describeIntent } from '../lib/voice/describe'
import { INTENT_BANK } from '../lib/voice/intentBank'
import { WAKE_WORD } from '../lib/voice/parser'

describe('describeIntent', () => {
  it('paraphrases task-focused, not transcript-focused', () => {
    expect(describeIntent({ kind: 'navigate', route: '/scales' })).toBe('open Scales')
    expect(describeIntent({ kind: 'metronome', action: 'start', bpm: 90 })).toBe(
      'start the metronome at 90',
    )
    expect(describeIntent({ kind: 'metronome', action: 'stop' })).toBe('stop the metronome')
    expect(describeIntent({ kind: 'set-bpm', delta: 10 })).toBe('go faster')
    expect(describeIntent({ kind: 'set-bpm', bpm: 120 })).toBe('set the tempo to 120')
    expect(describeIntent({ kind: 'play-demo', variant: 'arpeggio' })).toBe(
      'play it one note at a time',
    )
    expect(describeIntent({ kind: 'lesson', action: 'restart' })).toBe('start over')
    expect(describeIntent({ kind: 'free-play', action: 'clear' })).toBe('clear the notes')
    expect(describeIntent({ kind: 'voice-off' })).toBe('turn voice control off')
  })

  it('never empty for any intent the fallback bank can produce', () => {
    for (const template of INTENT_BANK) {
      for (const example of template.examples) {
        const intent = template.resolve(example)
        if (!intent) continue // required slot missing for this example
        expect(describeIntent(intent), `template ${template.id} ("${example}")`).not.toBe('')
      }
    }
  })

  it('never contains the wake word (would re-trigger recognition)', () => {
    for (const template of INTENT_BANK) {
      for (const example of template.examples) {
        const intent = template.resolve(example)
        if (!intent) continue
        expect(describeIntent(intent).toLowerCase()).not.toContain(WAKE_WORD)
      }
    }
  })

  it('conversation-control intents are never described', () => {
    expect(describeIntent({ kind: 'wake' })).toBe('')
    expect(describeIntent({ kind: 'affirm' })).toBe('')
    expect(describeIntent({ kind: 'deny' })).toBe('')
    expect(describeIntent({ kind: 'unknown', text: 'x' })).toBe('')
  })
})
