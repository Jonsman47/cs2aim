interface HotkeyHintProps {
  label: string
}

export function HotkeyHint({ label }: HotkeyHintProps) {
  return <span className="hotkey-hint">{label}</span>
}
