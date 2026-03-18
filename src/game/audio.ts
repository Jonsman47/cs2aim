const envelope = (
  context: AudioContext,
  frequency: number,
  duration: number,
  gainValue: number,
  type: OscillatorType,
) => {
  if (gainValue <= 0) {
    return
  }

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + duration,
  )
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration)
}

export interface AudioBus {
  fire: (weapon: WeaponMode, volume: number) => void
  hit: (headshot: boolean, wallbang: boolean, volume: number) => void
  miss: (volume: number) => void
}

export const createAudioBus = (): AudioBus => {
  let context: AudioContext | null = null

  const ensureContext = () => {
    context ??= new window.AudioContext()
    if (context.state === 'suspended') {
      void context.resume()
    }
    return context
  }

  return {
    fire(weapon, volume) {
      const audio = ensureContext()
      switch (weapon) {
        case 'ssg08':
          envelope(audio, 176, 0.15, 0.085 * volume, 'triangle')
          break
        case 'scar20':
          envelope(audio, 214, 0.1, 0.06 * volume, 'square')
          break
        case 'awp':
        default:
          envelope(audio, 140, 0.18, 0.1 * volume, 'triangle')
      }
    },
    hit(headshot, wallbang, volume) {
      const audio = ensureContext()
      envelope(audio, headshot ? 940 : 680, 0.06, 0.08 * volume, 'sine')
      if (wallbang) {
        envelope(audio, 360, 0.08, 0.035 * volume, 'triangle')
      }
    },
    miss(volume) {
      const audio = ensureContext()
      envelope(audio, 190, 0.045, 0.03 * volume, 'sawtooth')
    },
  }
}
import type { WeaponMode } from './types.ts'
