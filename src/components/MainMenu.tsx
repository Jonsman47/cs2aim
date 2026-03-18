import { useLayoutEffect, useState, type FormEvent } from 'react'
import { HotkeyHint } from './HotkeyHint.tsx'
import { PeekPreviewArt } from './PeekPreviewArt.tsx'
import { SettingsPanel } from './SettingsPanel.tsx'
import { WeaponPreviewArt } from './WeaponPreviewArt.tsx'
import {
  MODE_LABELS,
  PEEK_SELECTION_DETAILS,
  PEEK_SELECTION_LABELS,
  PEEK_SELECTIONS,
  PEEK_SPEED_DETAILS,
  PEEK_SPEED_LABELS,
  PEEK_SPEEDS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  WEAPON_PICKER_DETAILS,
  WEAPON_SELECTIONS,
  formatPeekSelectionLabel,
} from '../game/constants.ts'
import type {
  GameSettings,
  LeaderboardCategory,
  LeaderboardEntry,
  PeekSelection,
  PeekSpeedId,
  WeaponMode,
  XpProgress,
} from '../game/types.ts'

type MenuTab = 'play' | 'settings' | 'leaderboards'

interface MainMenuProps {
  settings: GameSettings
  lifetimeBest: number | null
  favoriteWeapon: WeaponMode
  averageShotTimeMs: number | null
  accountName: string | null
  xp: XpProgress | null
  authMessage: string | null
  leaderboards: Array<{
    id: LeaderboardCategory
    label: string
    entries: LeaderboardEntry[]
  }>
  onSelectWeapon: (weapon: WeaponMode) => void
  onSelectPeek: (selectedPeek: PeekSelection) => void
  onSelectSpeed: (selectedSpeed: PeekSpeedId) => void
  onSettingsChange: (updater: (current: GameSettings) => GameSettings) => void
  onStartSelected: () => void
  onLogin: (name: string, password: string) => void
  onRegister: (name: string, password: string) => void
  onLogout: () => void
}

const formatReaction = (value: number | null) =>
  value === null ? 'No qualifying shots yet' : `${Math.round(value)} ms`

const formatLevelProgress = (xp: XpProgress) =>
  `${xp.xpIntoLevel.toLocaleString()} XP / ${xp.xpNeededForNextLevel.toLocaleString()} XP`

export function MainMenu({
  settings,
  lifetimeBest,
  favoriteWeapon,
  averageShotTimeMs,
  accountName,
  xp,
  authMessage,
  leaderboards,
  onSelectWeapon,
  onSelectPeek,
  onSelectSpeed,
  onSettingsChange,
  onStartSelected,
  onLogin,
  onRegister,
  onLogout,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>('play')
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardCategory>('level')

  const handleTopPlayClick = () => {
    setActiveTab('play')
    onStartSelected()
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onLogin(loginName, loginPassword)
  }

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onRegister(registerName, registerPassword)
  }

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA' ||
          event.target.tagName === 'SELECT')
      ) {
        return
      }

      if (event.code === UI_KEYBINDS.toggleSettings.code) {
        event.preventDefault()
        setActiveTab((current) => (current === 'settings' ? 'play' : 'settings'))
        return
      }

      if (event.code === UI_KEYBINDS.startSelected.code && activeTab === 'play') {
        event.preventDefault()
        onStartSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeTab, onStartSelected])

  const renderAccountSettings = () => {
    if (accountName && xp) {
      return (
        <section className="panel">
          {authMessage && <p className="auth-status">{authMessage}</p>}
          <div className="panel-header">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Progression</h2>
            </div>
          </div>
          <div className="menu-meta account-meta">
            <div>
              <span>Logged In As</span>
              <strong>{accountName}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>Level {xp.level}</strong>
            </div>
            <div>
              <span>Progress To Next Level</span>
              <strong>{formatLevelProgress(xp)}</strong>
            </div>
          </div>
          <div className="level-strip">
            <div className="level-strip-bar">
              <div
                className="level-strip-fill"
                style={{ width: `${Math.max(xp.progress, 0.02) * 100}%` }}
              />
            </div>
          </div>
          <div className="menu-actions">
            <button className="secondary-button" onClick={onLogout}>
              Log Out
            </button>
          </div>
        </section>
      )
    }

    return (
      <>
        {authMessage && <p className="auth-status">{authMessage}</p>}
        <div className="account-grid">
          <section className="panel auth-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Login</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                <span>Name</span>
                <input
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  autoComplete="username"
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button className="primary-button" type="submit">
                Login
              </button>
            </form>
          </section>

          <section className="panel auth-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Register</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={handleRegister}>
              <label>
                <span>Name</span>
                <input
                  value={registerName}
                  onChange={(event) => setRegisterName(event.target.value)}
                  autoComplete="username"
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button className="secondary-button" type="submit">
                Register
              </button>
            </form>
          </section>
        </div>
      </>
    )
  }

  return (
    <div className="menu-overlay">
      <div className="menu-card menu-card-rich">
        <div className="menu-header">
          <div>
            <p className="eyebrow">cs2aim</p>
            <h1>CS2AIM</h1>
            <p className="menu-subtitle">CS2 Aim trainer</p>
            <p className="menu-copy">Simple web based aim training for cs2.</p>
          </div>

          <div className="menu-tab-row">
            <button
              className={`menu-tab-button ${activeTab === 'play' ? 'is-active' : ''}`}
              type="button"
              onClick={handleTopPlayClick}
            >
              Play <HotkeyHint label={UI_KEYBINDS.startSelected.label} />
            </button>
            <button
              className={`menu-tab-button ${activeTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings <HotkeyHint label={UI_KEYBINDS.toggleSettings.label} />
            </button>
            <button
              className={`menu-tab-button ${activeTab === 'leaderboards' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('leaderboards')}
            >
              Leaderboards
            </button>
          </div>
        </div>

        {activeTab === 'play' && (
          <>
            <div className="menu-meta">
              <div>
                <span>Selected Peek</span>
                <strong>{formatPeekSelectionLabel(settings.selectedPeek, settings.selectedSpeed)}</strong>
              </div>
              <div>
                <span>Favorite Weapon</span>
                <strong>{WEAPON_LABELS[favoriteWeapon]}</strong>
              </div>
              <div>
                <span>Wallhack</span>
                <strong>{settings.doorVisibilityAssist ? 'On' : 'Off'}</strong>
              </div>
              <div>
                <span>Best Local Shot</span>
                <strong>
                  {lifetimeBest === null ? 'No scored shot yet' : `${Math.round(lifetimeBest)} ms`}
                </strong>
              </div>
              <div>
                <span>Progression</span>
                {accountName && xp ? (
                  <div className="progress-readout">
                    <strong>Level {xp.level}</strong>
                    <span className="progress-readout-detail">{formatLevelProgress(xp)}</span>
                  </div>
                ) : (
                  <strong>Open Settings &gt; Account to bank XP</strong>
                )}
              </div>
              <div>
                <span>Average Shot Time</span>
                <strong>{formatReaction(averageShotTimeMs)}</strong>
              </div>
            </div>

            <div className="subheading-row menu-subheading">
              <span>Step 1: Pick the exact peek to train</span>
              <span>{MODE_LABELS[settings.mode]}</span>
            </div>

            <div className="mode-grid">
              {PEEK_SELECTIONS.map((selectedPeek) => (
                <button
                  key={selectedPeek}
                  className={`mode-tile ${
                    settings.selectedPeek === selectedPeek ? 'is-active' : ''
                  }`}
                  onClick={() => onSelectPeek(selectedPeek)}
                >
                  <span className="mode-name">{PEEK_SELECTION_LABELS[selectedPeek]}</span>
                  <span className="mode-copy">{PEEK_SELECTION_DETAILS[selectedPeek]}</span>
                  <PeekPreviewArt peek={selectedPeek} />
                </button>
              ))}
            </div>

            <div className="subheading-row menu-subheading">
              <span>Step 2: Choose the weapon before you start</span>
              <span>{WEAPON_LABELS[settings.weapon]}</span>
            </div>

            <div className="weapon-grid">
              {WEAPON_SELECTIONS.map((weapon) => (
                <button
                  key={weapon}
                  className={`weapon-tile ${settings.weapon === weapon ? 'is-active' : ''}`}
                  onClick={() => onSelectWeapon(weapon)}
                >
                  <span className="mode-name">{WEAPON_LABELS[weapon]}</span>
                  <span className="mode-copy">{WEAPON_PICKER_DETAILS[weapon].blurb}</span>
                  <WeaponPreviewArt weapon={weapon} />
                  <span className="weapon-rule">{WEAPON_PICKER_DETAILS[weapon].finishRule}</span>
                </button>
              ))}
            </div>

            <div className="subheading-row menu-subheading">
              <span>Step 3: Choose the speed preset</span>
              <span>{PEEK_SPEED_LABELS[settings.selectedSpeed]}</span>
            </div>

            <div className="segment-grid segment-grid-speeds menu-speed-grid">
              {PEEK_SPEEDS.map((selectedSpeed) => (
                <button
                  key={selectedSpeed}
                  type="button"
                  className={`segment-button ${
                    settings.selectedSpeed === selectedSpeed ? 'is-active' : ''
                  }`}
                  onClick={() => onSelectSpeed(selectedSpeed)}
                >
                  {PEEK_SPEED_LABELS[selectedSpeed]}
                </button>
              ))}
            </div>

            <p className="menu-copy menu-tip">
              {PEEK_SPEED_DETAILS[settings.selectedSpeed]} The weapon choice above is part of the
              training start flow and is always applied before the session begins.
            </p>

            <div className="menu-actions">
              <button className="primary-button" onClick={onStartSelected}>
                Start Selected Peek <HotkeyHint label={UI_KEYBINDS.startSelected.label} />
              </button>
              <button className="ghost-button" onClick={() => setActiveTab('settings')}>
                Open Settings <HotkeyHint label={UI_KEYBINDS.toggleSettings.label} />
              </button>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="menu-settings-shell">
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
            <div className="settings-account-shell">{renderAccountSettings()}</div>
          </div>
        )}

        {activeTab === 'leaderboards' && (
          <div className="leaderboard-shell">
            <div className="segment-grid segment-grid-peeks leaderboard-filter-grid">
              {leaderboards.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`segment-button ${
                    activeLeaderboard === category.id ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveLeaderboard(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="leaderboard-list">
              {(leaderboards.find((category) => category.id === activeLeaderboard)?.entries ?? []).map(
                (entry, index) => (
                  <div key={`${activeLeaderboard}-${entry.name}`} className="leaderboard-row">
                    <div className="leaderboard-rank">#{index + 1}</div>
                    <div>
                      <strong>{entry.name}</strong>
                      {entry.secondaryValue && <span>{entry.secondaryValue}</span>}
                    </div>
                    <b>{entry.value}</b>
                  </div>
                ),
              )}

              {(leaderboards.find((category) => category.id === activeLeaderboard)?.entries.length ??
                0) === 0 && (
                <p className="empty-copy">
                  No registered players yet. Create an account and start landing shots to populate
                  the boards.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="menu-footer">Made by Jonsman</p>
      </div>
    </div>
  )
}
