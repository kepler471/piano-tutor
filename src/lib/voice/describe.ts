import { SCREEN_NAME_FOR_ROUTE, type Intent } from './intents'

/**
 * Short spoken paraphrase of an intent, used by the "did you mean" prompt
 * ("Start the metronome — right?"). Focuses on the task, not on what the user
 * said (ACIxD confirmation guidance). Must never contain the wake word and
 * never be empty for any intent the fallback bank can produce.
 */

const INVERSION_NAMES = ['root position', 'first inversion', 'second inversion', 'third inversion']

export function describeIntent(intent: Intent): string {
  switch (intent.kind) {
    case 'navigate':
      return `open ${SCREEN_NAME_FOR_ROUTE[intent.route] ?? 'that screen'}`
    case 'show-stage':
      return `open stage ${intent.stage}`
    case 'show-unit':
      return `open unit ${intent.unit}`
    case 'metronome':
      if (intent.action === 'stop') return 'stop the metronome'
      return intent.bpm !== undefined ? `start the metronome at ${intent.bpm}` : 'start the metronome'
    case 'set-bpm':
      if (intent.bpm !== undefined) return `set the tempo to ${intent.bpm}`
      return (intent.delta ?? 0) > 0 ? 'go faster' : 'go slower'
    case 'stop-all':
      return 'stop everything'
    case 'help':
      return 'hear what you can say'
    case 'repeat':
      return 'say that again'
    case 'go-back':
      return 'go back'
    case 'voice-off':
      return 'turn voice control off'
    case 'mic':
      return intent.action === 'start' ? 'listen to your playing' : 'stop listening to your playing'
    case 'show-scale':
      return `show the ${[intent.root, intent.scaleType ?? ''].join(' ').trim() || 'that'} scale`
    case 'show-chord':
      return `show the ${[intent.root, intent.quality ?? ''].join(' ').trim() || 'that'} chord`
    case 'set-inversion':
      return INVERSION_NAMES[intent.inversion]
    case 'set-hand':
      return intent.hand === 'L' ? 'the left hand' : 'the right hand'
    case 'play-demo':
      if (intent.variant === 'arpeggio') return 'play it one note at a time'
      if (intent.variant === 'block') return 'play it all at once'
      return 'play it'
    case 'open-lesson':
      return `open ${intent.query}`
    case 'lesson':
      switch (intent.action) {
        case 'restart':
          return 'start over'
        case 'next':
          return 'go to the next part'
        case 'previous':
          return 'go back a part'
        case 'exit':
          return 'leave the lesson'
        case 'new-melody':
          return 'get a new melody'
      }
      break
    case 'free-play':
      switch (intent.action) {
        case 'set-mode':
          return intent.mode === 'chords' ? 'switch to chord mode' : 'switch to melody mode'
        case 'record':
          return intent.bpm !== undefined ? `record at ${intent.bpm}` : 'start recording'
        case 'stop-recording':
          return 'stop recording'
        case 'clear':
          return 'clear the notes'
        case 'copy':
          return 'copy the notes'
      }
      break
    // Conversation-control intents are never suggested.
    case 'wake':
    case 'deny':
    case 'affirm':
    case 'unknown':
      break
  }
  return ''
}
