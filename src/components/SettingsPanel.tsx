import { CrosshairPreview } from './CrosshairPreview.js'
import { HotkeyHint } from './HotkeyHint.js'
import {
  CROSSHAIR_COLOR_PRESETS,
  ENEMY_COLOR_PRESETS,
  GRAPHICS_QUALITY_DETAILS,
  GRAPHICS_QUALITY_LABELS,
  GRAPHICS_QUALITY_OPTIONS,
  MISS_PUNISHMENT_LABELS,
  NORMAL_CROSSHAIR_PRESETS,
  NORMAL_CROSSHAIR_PRESET_LABELS,
  PEEK_SELECTION_LABELS,
  PEEK_SELECTIONS,
  PEEK_SPEED_LABELS,
  PEEK_SPEEDS,
  SESSION_LENGTH_OPTIONS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  withDerivedMode,
} from '../game/constants.js'
import type {
  CrosshairColorPreset,
  EnemyColorPreset,
  GameSettings,
  GraphicsQualityId,
  MissPunishment,
  NormalCrosshairSettings,
  PeekSelection,
  PeekSpeedId,
  ScopedInnerCrosshairStyle,
} from '../game/types.js'

interface SettingsPanelProps {
  settings: GameSettings
  onChange: (updater: (current: GameSettings) => GameSettings) => void
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onChange: (value: number) => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format = (next) => next.toFixed(2),
  onChange,
}: SliderRowProps) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <strong>{format(value)}</strong>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function SegmentButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`segment-button ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function ToggleTile({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}

const formatSeconds = (value: number) => `${(value / 1000).toFixed(1)} s`

const COLOR_PRESET_OPTIONS: Array<{ id: CrosshairColorPreset; label: string }> = [
  { id: 'classic-green', label: 'Green' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'white', label: 'White' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'red', label: 'Red' },
]

const ENEMY_COLOR_OPTIONS: Array<{ id: EnemyColorPreset; label: string }> = [
  { id: 'default', label: 'Default' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'purple', label: 'Purple' },
  { id: 'custom', label: 'Custom' },
]

const NORMAL_CROSSHAIR_PRESET_IDS = Object.keys(
  NORMAL_CROSSHAIR_PRESETS,
) as Array<keyof typeof NORMAL_CROSSHAIR_PRESETS>

const NORMAL_CROSSHAIR_COMPARE_KEYS: Array<keyof NormalCrosshairSettings> = [
  'colorPreset',
  'color',
  'showCenterDot',
  'centerDotSize',
  'centerDotOpacity',
  'lineLength',
  'gap',
  'thickness',
  'opacity',
  'outline',
  'outlineThickness',
  'dynamicMode',
  'tStyle',
]

const matchesNormalCrosshairPreset = (
  current: NormalCrosshairSettings,
  preset: NormalCrosshairSettings,
) =>
  NORMAL_CROSSHAIR_COMPARE_KEYS.every((key) => current[key] === preset[key])

const updateNormalCrosshair =
  (
    onChange: SettingsPanelProps['onChange'],
    updater: (current: GameSettings['crosshair']['normal']) => GameSettings['crosshair']['normal'],
  ) =>
  () =>
    onChange((current) => ({
      ...current,
      crosshair: {
        ...current.crosshair,
        normal: updater(current.crosshair.normal),
      },
    }))

const updateScopedCrosshair =
  (
    onChange: SettingsPanelProps['onChange'],
    updater: (current: GameSettings['crosshair']['scoped']) => GameSettings['crosshair']['scoped'],
  ) =>
  () =>
    onChange((current) => ({
      ...current,
      crosshair: {
        ...current.crosshair,
        scoped: updater(current.crosshair.scoped),
      },
    }))

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-stack menu-settings">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Mouse</p>
            <h2>Mouse And Aim Control</h2>
          </div>
        </div>

        <div className="settings-grid">
          <SliderRow
            label="Mouse sensitivity"
            value={settings.mouseSensitivity}
            min={0.2}
            max={2.5}
            step={0.01}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                mouseSensitivity: value,
              }))
            }
          />
          <SliderRow
            label="Scoped sensitivity multiplier"
            value={settings.scopeSensitivityMultiplier}
            min={0.45}
            max={1.1}
            step={0.01}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                scopeSensitivityMultiplier: value,
              }))
            }
          />
          <SliderRow
            label="Horizontal aim range"
            value={settings.difficulty.horizontalAimRange}
            min={0.4}
            max={1}
            step={0.02}
            format={(value) => `${(value * 100).toFixed(0)}%`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  horizontalAimRange: value,
                },
              }))
            }
          />
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.difficulty.verticalAimEnabled}
            label="Enable vertical aim"
            onChange={(verticalAimEnabled) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  verticalAimEnabled,
                },
              }))
            }
          />
        </div>

        <p className="eyebrow">Miss punishment</p>
        <div className="segment-grid">
          {Object.entries(MISS_PUNISHMENT_LABELS).map(([id, label]) => (
            <SegmentButton
              key={id}
              label={label}
              active={settings.difficulty.missPunishment === id}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  difficulty: {
                    ...current.difficulty,
                    missPunishment: id as MissPunishment,
                  },
                }))
              }
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Crosshair</p>
            <h2>Unscoped Crosshair</h2>
          </div>
        </div>

        <CrosshairPreview
          variant="normal"
          normal={settings.crosshair.normal}
          scoped={settings.crosshair.scoped}
        />

        <p className="eyebrow">Built-in presets</p>
        <div className="segment-grid segment-grid-peeks">
          {NORMAL_CROSSHAIR_PRESET_IDS.map((presetId) => (
            <SegmentButton
              key={presetId}
              label={NORMAL_CROSSHAIR_PRESET_LABELS[presetId]}
              active={matchesNormalCrosshairPreset(
                settings.crosshair.normal,
                NORMAL_CROSSHAIR_PRESETS[presetId],
              )}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  crosshair: {
                    ...current.crosshair,
                    normal: { ...NORMAL_CROSSHAIR_PRESETS[presetId] },
                  },
                }))
              }
            />
          ))}
        </div>

        <p className="eyebrow">Color presets</p>
        <div className="segment-grid segment-grid-short">
          {COLOR_PRESET_OPTIONS.map((preset) => (
            <SegmentButton
              key={preset.id}
              label={preset.label}
              active={settings.crosshair.normal.colorPreset === preset.id}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  crosshair: {
                    ...current.crosshair,
                    normal: {
                      ...current.crosshair.normal,
                      colorPreset: preset.id,
                      color: CROSSHAIR_COLOR_PRESETS[preset.id],
                    },
                  },
                }))
              }
            />
          ))}
        </div>

        <label className="color-row">
          <span>Custom color</span>
          <input
            type="color"
            value={settings.crosshair.normal.color}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    colorPreset: 'custom',
                    color: event.target.value,
                  },
                },
              }))
            }
          />
        </label>

        <div className="settings-grid">
          <SliderRow
            label="Line length"
            value={settings.crosshair.normal.lineLength}
            min={0}
            max={28}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                lineLength: value,
              }))()
            }
          />
          <SliderRow
            label="Line thickness"
            value={settings.crosshair.normal.thickness}
            min={1}
            max={5}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                thickness: value,
              }))()
            }
          />
          <SliderRow
            label="Line gap"
            value={settings.crosshair.normal.gap}
            min={0}
            max={18}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                gap: value,
              }))()
            }
          />
          <SliderRow
            label="Opacity"
            value={settings.crosshair.normal.opacity}
            min={0.2}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                opacity: value,
              }))()
            }
          />
          <SliderRow
            label="Center dot size"
            value={settings.crosshair.normal.centerDotSize}
            min={1}
            max={8}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                centerDotSize: value,
              }))()
            }
          />
          <SliderRow
            label="Center dot opacity"
            value={settings.crosshair.normal.centerDotOpacity}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                centerDotOpacity: value,
              }))()
            }
          />
          <SliderRow
            label="Outline thickness"
            value={settings.crosshair.normal.outlineThickness}
            min={1}
            max={4}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateNormalCrosshair(onChange, (current) => ({
                ...current,
                outlineThickness: value,
              }))()
            }
          />
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.crosshair.normal.showCenterDot}
            label="Show center dot"
            onChange={(showCenterDot) =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    showCenterDot,
                  },
                },
              }))
            }
          />
          <ToggleTile
            checked={settings.crosshair.normal.outline}
            label="Outline"
            onChange={(outline) =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    outline,
                  },
                },
              }))
            }
          />
          <ToggleTile
            checked={settings.crosshair.normal.tStyle}
            label="T-style"
            onChange={(tStyle) =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    tStyle,
                  },
                },
              }))
            }
          />
        </div>

        <p className="eyebrow">Dynamic behavior</p>
        <div className="segment-grid">
          <SegmentButton
            label="Static"
            active={settings.crosshair.normal.dynamicMode === 'static'}
            onClick={() =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    dynamicMode: 'static',
                  },
                },
              }))
            }
          />
          <SegmentButton
            label="Slight Dynamic"
            active={settings.crosshair.normal.dynamicMode === 'slight'}
            onClick={() =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  normal: {
                    ...current.crosshair.normal,
                    dynamicMode: 'slight',
                  },
                },
              }))
            }
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Scope</p>
            <h2>Scoped Overlay</h2>
          </div>
        </div>

        <CrosshairPreview
          variant="scoped"
          normal={settings.crosshair.normal}
          scoped={settings.crosshair.scoped}
        />

        <p className="eyebrow">Inner crosshair style</p>
        <div className="segment-grid segment-grid-short">
          {(['none', 'cross', 'dot'] as ScopedInnerCrosshairStyle[]).map((style) => (
            <SegmentButton
              key={style}
              label={style}
              active={settings.crosshair.scoped.innerStyle === style}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  crosshair: {
                    ...current.crosshair,
                    scoped: {
                      ...current.crosshair.scoped,
                      innerStyle: style,
                    },
                  },
                }))
              }
            />
          ))}
        </div>

        <div className="settings-grid">
          <SliderRow
            label="Scope line thickness"
            value={settings.crosshair.scoped.lineThickness}
            min={1}
            max={4}
            step={0.1}
            format={(value) => `${value.toFixed(1)} px`}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                lineThickness: value,
              }))()
            }
          />
          <SliderRow
            label="Scope line opacity"
            value={settings.crosshair.scoped.lineOpacity}
            min={0.2}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                lineOpacity: value,
              }))()
            }
          />
          <SliderRow
            label="Center dot size"
            value={settings.crosshair.scoped.centerDotSize}
            min={1}
            max={6}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                centerDotSize: value,
              }))()
            }
          />
          <SliderRow
            label="Center dot opacity"
            value={settings.crosshair.scoped.centerDotOpacity}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                centerDotOpacity: value,
              }))()
            }
          />
          <SliderRow
            label="Inner crosshair size"
            value={settings.crosshair.scoped.innerSize}
            min={4}
            max={16}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                innerSize: value,
              }))()
            }
          />
          <SliderRow
            label="Inner crosshair gap"
            value={settings.crosshair.scoped.innerGap}
            min={0}
            max={12}
            step={1}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                innerGap: value,
              }))()
            }
          />
          <SliderRow
            label="Inner crosshair opacity"
            value={settings.crosshair.scoped.innerOpacity}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                innerOpacity: value,
              }))()
            }
          />
          <SliderRow
            label="Black border intensity"
            value={settings.crosshair.scoped.borderOpacity}
            min={0.2}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                borderOpacity: value,
              }))()
            }
          />
          <SliderRow
            label="Scoped overlay opacity"
            value={settings.crosshair.scoped.overlayOpacity}
            min={0.15}
            max={1}
            step={0.01}
            onChange={(value) =>
              updateScopedCrosshair(onChange, (current) => ({
                ...current,
                overlayOpacity: value,
              }))()
            }
          />
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.crosshair.scoped.centerDot}
            label="Scoped center dot"
            onChange={(centerDot) =>
              onChange((current) => ({
                ...current,
                crosshair: {
                  ...current.crosshair,
                  scoped: {
                    ...current.crosshair.scoped,
                    centerDot,
                  },
                },
              }))
            }
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Video</p>
            <h2>Display And Visual Clarity</h2>
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.darkTheme}
            label="Tactical dark theme"
            onChange={(darkTheme) =>
              onChange((current) => ({
                ...current,
                darkTheme,
              }))
            }
          />
          <ToggleTile
            checked={settings.rawMode}
            label="Raw mode"
            onChange={(rawMode) =>
              onChange((current) => ({
                ...current,
                rawMode,
              }))
            }
          />
        </div>

        <p className="eyebrow">Graphics quality</p>
        <div className="segment-grid segment-grid-peeks">
          {GRAPHICS_QUALITY_OPTIONS.map((quality) => (
            <SegmentButton
              key={quality}
              label={GRAPHICS_QUALITY_LABELS[quality]}
              active={settings.graphicsQuality === quality}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  graphicsQuality: quality as GraphicsQualityId,
                }))
              }
            />
          ))}
        </div>

        <p className="settings-note">
          {GRAPHICS_QUALITY_DETAILS[settings.graphicsQuality]}
        </p>

        <SliderRow
          label="Enemy visibility strength"
          value={settings.difficulty.visibilityLevel}
          min={0.3}
          max={1}
          step={0.02}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              difficulty: {
                ...current.difficulty,
                visibilityLevel: value,
              },
            }))
          }
        />

        <p className="eyebrow">Enemy / target visuals</p>
        <div className="segment-grid segment-grid-short">
          {ENEMY_COLOR_OPTIONS.map((preset) => (
            <SegmentButton
              key={preset.id}
              label={preset.label}
              active={settings.enemyColorPreset === preset.id}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  enemyColorPreset: preset.id,
                  enemyColor:
                    preset.id === 'default' || preset.id === 'custom'
                      ? current.enemyColor
                      : ENEMY_COLOR_PRESETS[preset.id],
                }))
              }
            />
          ))}
        </div>

        <label className="color-row">
          <span>Custom enemy color</span>
          <input
            type="color"
            value={settings.enemyColor}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                enemyColorPreset: 'custom',
                enemyColor: event.target.value,
              }))
            }
          />
        </label>

        <p className="settings-note">
          Default keeps the current dark enemy look exactly as it is now. If you pick a custom
          color, it only affects normal enemy rendering, while the existing wallhack / through-door
          assist visual stays unchanged.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Audio</p>
            <h2>Sound And Volume</h2>
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.soundEnabled}
            label="Enable synth audio"
            onChange={(soundEnabled) =>
              onChange((current) => ({
                ...current,
                soundEnabled,
              }))
            }
          />
        </div>

        <SliderRow
          label="Master volume"
          value={settings.masterVolume}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              masterVolume: value,
            }))
          }
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Gameplay</p>
            <h2>Session And HUD Behavior</h2>
          </div>
        </div>

        <p className="eyebrow">Session length</p>
        <div className="segment-grid segment-grid-short">
          {SESSION_LENGTH_OPTIONS.map((length) => (
            <SegmentButton
              key={length}
              label={`${length} reps`}
              active={settings.sessionLength === length}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  sessionLength: length,
                }))
              }
            />
          ))}
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.showScoringBreakdown}
            label="Show scoring breakdown"
            onChange={(showScoringBreakdown) =>
              onChange((current) => ({
                ...current,
                showScoringBreakdown,
              }))
            }
          />
          <ToggleTile
            checked={settings.showHitLabels}
            label="Show hit labels"
            onChange={(showHitLabels) =>
              onChange((current) => ({
                ...current,
                showHitLabels,
              }))
            }
          />
          <ToggleTile
            checked={settings.enableRecoil}
            label="Enable recoil kick"
            onChange={(enableRecoil) =>
              onChange((current) => ({
                ...current,
                enableRecoil,
              }))
            }
          />
          <ToggleTile
            checked={settings.scopedView}
            label="Optical scope zoom"
            onChange={(scopedView) =>
              onChange((current) => ({
                ...current,
                scopedView,
              }))
            }
          />
          <ToggleTile
            checked={settings.allowDoubleActive}
            label="Allow double active targets"
            onChange={(allowDoubleActive) =>
              onChange((current) => ({
                ...current,
                allowDoubleActive,
              }))
            }
          />
        </div>

        <div className="settings-grid">
          <SliderRow
            label="Recoil strength"
            value={settings.recoilStrength}
            min={0}
            max={1.5}
            step={0.05}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                recoilStrength: value,
              }))
            }
          />
        </div>

        <p className="settings-note">
          Right click still cycles unscoped, scope 1, and scope 2.{' '}
          {WEAPON_LABELS[settings.weapon]} uses its own fixed weapon timing during live play, and
          pressing <HotkeyHint label={UI_KEYBINDS.nextTry.label} /> after a successful result
          instantly runs the next rep.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Training</p>
            <h2>Peek Library And Timing</h2>
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleTile
            checked={settings.doorVisibilityAssist}
            label="Wallhack"
            onChange={(doorVisibilityAssist) =>
              onChange((current) => ({
                ...current,
                doorVisibilityAssist,
              }))
            }
          />
          <ToggleTile
            checked={settings.mixedModeRandomness}
            label="Enable mixed randomness"
            onChange={(mixedModeRandomness) =>
              onChange((current) => ({
                ...current,
                mixedModeRandomness,
              }))
            }
          />
        </div>

        <p className="eyebrow">Selected peek</p>
        <div className="segment-grid segment-grid-peeks">
          {PEEK_SELECTIONS.map((selectedPeek) => (
            <SegmentButton
              key={selectedPeek}
              label={PEEK_SELECTION_LABELS[selectedPeek]}
              active={settings.selectedPeek === selectedPeek}
              onClick={() =>
                onChange((current) =>
                  withDerivedMode({
                    ...current,
                    selectedPeek: selectedPeek as PeekSelection,
                  }),
                )
              }
            />
          ))}
        </div>

        <p className="eyebrow">Peek speed preset</p>
        <div className="segment-grid segment-grid-speeds">
          {PEEK_SPEEDS.map((selectedSpeed) => (
            <SegmentButton
              key={selectedSpeed}
              label={PEEK_SPEED_LABELS[selectedSpeed]}
              active={settings.selectedSpeed === selectedSpeed}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  selectedSpeed: selectedSpeed as PeekSpeedId,
                }))
              }
            />
          ))}
        </div>

        <div className="settings-grid">
          <SliderRow
            label="Pre-peek delay minimum"
            value={settings.prePeekDelayMinMs}
            min={500}
            max={10000}
            step={250}
            format={formatSeconds}
            onChange={(value) =>
              onChange((current) => {
                const nextMin = value
                return {
                  ...current,
                  prePeekDelayMinMs: nextMin,
                  prePeekDelayMaxMs: Math.max(current.prePeekDelayMaxMs, nextMin),
                }
              })
            }
          />
          <SliderRow
            label="Pre-peek delay maximum"
            value={settings.prePeekDelayMaxMs}
            min={1000}
            max={10000}
            step={250}
            format={formatSeconds}
            onChange={(value) =>
              onChange((current) => {
                const nextMax = value
                return {
                  ...current,
                  prePeekDelayMinMs: Math.min(current.prePeekDelayMinMs, nextMax),
                  prePeekDelayMaxMs: nextMax,
                }
              })
            }
          />
          <SliderRow
            label="Enemy speed scalar"
            value={settings.difficulty.enemySpeed}
            min={0.5}
            max={1.5}
            step={0.05}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  enemySpeed: value,
                },
              }))
            }
          />
          <SliderRow
            label="Peek duration scalar"
            value={settings.difficulty.peekDuration}
            min={0.6}
            max={1.5}
            step={0.05}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  peekDuration: value,
                },
              }))
            }
          />
          <SliderRow
            label="Delay randomness"
            value={settings.difficulty.delayRandomness}
            min={0}
            max={1}
            step={0.02}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  delayRandomness: value,
                },
              }))
            }
          />
          <SliderRow
            label="Fake peek bias"
            value={settings.difficulty.fakeFrequency}
            min={0}
            max={1}
            step={0.02}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  fakeFrequency: value,
                },
              }))
            }
          />
          <SliderRow
            label="Wallbang bias"
            value={settings.difficulty.wallbangFrequency}
            min={0}
            max={1}
            step={0.02}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  wallbangFrequency: value,
                },
              }))
            }
          />
          <SliderRow
            label="Hitbox scale"
            value={settings.difficulty.hitboxScale}
            min={0.75}
            max={1.2}
            step={0.01}
            format={(value) => `${value.toFixed(2)}x`}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                difficulty: {
                  ...current.difficulty,
                  hitboxScale: value,
                },
              }))
            }
          />
        </div>
      </section>
    </div>
  )
}
