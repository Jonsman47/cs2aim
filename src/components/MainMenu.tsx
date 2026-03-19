import { useLayoutEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { AdminPanel, type AdminPanelModel } from './AdminPanel.js'
import { FeedbackHub } from './FeedbackHub.js'
import { HotkeyHint } from './HotkeyHint.js'
import { PeekPreviewArt } from './PeekPreviewArt.js'
import { SettingsPanel } from './SettingsPanel.js'
import { WeaponPreviewArt } from './WeaponPreviewArt.js'
import {
  MODE_LABELS,
  PEEK_SELECTION_LABELS,
  PEEK_SPEED_DETAILS,
  PEEK_SPEED_LABELS,
  PEEK_SPEEDS,
  UI_KEYBINDS,
  WEAPON_LABELS,
  WEAPON_PICKER_DETAILS,
  formatPeekSelectionLabel,
} from '../game/constants.js'
import type {
  AdminAnnouncement,
  FeedbackPost,
  GameSettings,
  HomepageNotice,
  MessageTone,
  PeekSelection,
  PeekSpeedId,
  WeaponMode,
  XpProgress,
} from '../game/types.js'

type MenuTab = 'play' | 'settings' | 'admin'

interface MainMenuProps {
  settings: GameSettings
  lifetimeBest: number | null
  favoriteWeapon: WeaponMode
  averageShotTimeMs: number | null
  accountName: string | null
  loggedInAccountName: string | null
  xp: XpProgress | null
  authMessage: string | null
  feedbackPosts: FeedbackPost[]
  feedbackStatus: {
    bugReport: { tone: 'good' | 'warn'; message: string } | null
    featureRequest: { tone: 'good' | 'warn'; message: string } | null
    review: { tone: 'good' | 'warn'; message: string } | null
  }
  feedbackAccess: {
    isLoggedIn: boolean
    bugReportLastSubmittedAt: number | null
    featureRequestLastSubmittedAt: number | null
  }
  isAdmin: boolean
  adminBadgeVisible: boolean
  adminPanel: AdminPanelModel | null
  modeOptions: Array<{
    id: PeekSelection
    description: string
    popular: boolean
    highlightColor: string
    previewVariantClass: string
    featured: boolean
    experimental: boolean
  }>
  weaponOptions: Array<{
    id: WeaponMode
    featured: boolean
  }>
  announcements: AdminAnnouncement[]
  bannerText: string
  featuredMessage: string
  homepageNotices: HomepageNotice[]
  lobbyMessage: string
  specialTheme: {
    seasonalClass: string
    jonsmanThemeClass: string
    accentColor: string
    footerText: string
    footerStyle: 'default' | 'gradient' | 'glow'
    confettiEnabled: boolean
    specialUiHighlights: boolean
    goofyEventTitle: string
    fakeGlobalChallenge: string
    jonsmanWasHereEnabled: boolean
  }
  onSelectWeapon: (weapon: WeaponMode) => void
  onSelectPeek: (selectedPeek: PeekSelection) => void
  onSelectSpeed: (selectedSpeed: PeekSpeedId) => void
  onSettingsChange: (updater: (current: GameSettings) => GameSettings) => void
  onStartSelected: () => void
  onLogin: (name: string, password: string) => void
  onRegister: (name: string, password: string) => void
  onLogout: () => void
  onSubmitBugReport: (body: string) => boolean | Promise<boolean>
  onSubmitFeatureRequest: (body: string) => boolean | Promise<boolean>
  onSubmitReview: (body: string) => boolean | Promise<boolean>
}

const formatReaction = (value: number | null) =>
  value === null ? 'No qualifying shots yet' : `${Math.round(value)} ms`

const formatLevelProgress = (xp: XpProgress) =>
  `${xp.xpIntoLevel.toLocaleString()} XP / ${xp.xpNeededForNextLevel.toLocaleString()} XP`

const toneClassName = (tone: MessageTone) => `tone-${tone}`

export function MainMenu({
  settings,
  lifetimeBest,
  favoriteWeapon,
  averageShotTimeMs,
  accountName,
  loggedInAccountName,
  xp,
  authMessage,
  feedbackPosts,
  feedbackStatus,
  feedbackAccess,
  isAdmin,
  adminBadgeVisible,
  adminPanel,
  modeOptions,
  weaponOptions,
  announcements,
  bannerText,
  featuredMessage,
  homepageNotices,
  lobbyMessage,
  specialTheme,
  onSelectWeapon,
  onSelectPeek,
  onSelectSpeed,
  onSettingsChange,
  onStartSelected,
  onLogin,
  onRegister,
  onLogout,
  onSubmitBugReport,
  onSubmitFeatureRequest,
  onSubmitReview,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>('play')
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const resolvedTab = !isAdmin && activeTab === 'admin' ? 'play' : activeTab

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

      if (event.code === UI_KEYBINDS.startSelected.code && resolvedTab === 'play') {
        event.preventDefault()
        onStartSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onStartSelected, resolvedTab])

  const renderAccountSettings = () => {
    if (loggedInAccountName && xp) {
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
              <div className="leaderboard-name-line">
                <strong className={isAdmin ? 'leaderboard-name-admin' : ''}>
                  {loggedInAccountName}
                </strong>
                {isAdmin && adminBadgeVisible && (
                  <span className="leaderboard-admin-badge">Admin</span>
                )}
              </div>
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

        {accountName && xp && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Guest Profile</p>
                <h2>Anonymous Progression</h2>
              </div>
            </div>
            <p className="menu-copy">
              Anonymous play still saves XP, level, and combat stats locally in this browser.
              If you register from this profile, that local progression transfers into the
              new account automatically on this device.
            </p>
            <div className="menu-meta account-meta">
              <div>
                <span>Guest Name</span>
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
          </section>
        )}
      </>
    )
  }

  const renderSiteSignals = () => {
    const hasTopSignals =
      bannerText.trim() ||
      announcements.length > 0 ||
      featuredMessage.trim() ||
      lobbyMessage.trim() ||
      homepageNotices.length > 0 ||
      specialTheme.goofyEventTitle.trim() ||
      specialTheme.fakeGlobalChallenge.trim() ||
      specialTheme.jonsmanWasHereEnabled

    if (!hasTopSignals) {
      return null
    }

    return (
      <div className="menu-story-stack">
        {bannerText.trim() && (
          <div className="menu-banner-strip">
            <strong>Announcement</strong>
            <span>{bannerText}</span>
          </div>
        )}

        {announcements.length > 0 && (
          <div className="menu-notice-grid">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className={`menu-signal-card ${toneClassName(announcement.tone)}`}
              >
                <strong>{announcement.text}</strong>
                {announcement.expiresAt !== null && (
                  <span>
                    Until{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(announcement.expiresAt)}
                  </span>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="menu-notice-grid">
          {featuredMessage.trim() && (
            <article className="menu-signal-card tone-good">
              <strong>Featured Message</strong>
              <span>{featuredMessage}</span>
            </article>
          )}
          {lobbyMessage.trim() && (
            <article className="menu-signal-card tone-neutral">
              <strong>Lobby Message</strong>
              <span>{lobbyMessage}</span>
            </article>
          )}
          {specialTheme.goofyEventTitle.trim() && (
            <article className="menu-signal-card tone-bonus">
              <strong>Goofy Event</strong>
              <span>{specialTheme.goofyEventTitle}</span>
            </article>
          )}
          {specialTheme.fakeGlobalChallenge.trim() && (
            <article className="menu-signal-card tone-warn">
              <strong>Global Challenge</strong>
              <span>{specialTheme.fakeGlobalChallenge}</span>
            </article>
          )}
          {specialTheme.jonsmanWasHereEnabled && (
            <article className="menu-signal-card tone-good">
              <strong>Jonsman Was Here</strong>
              <span>The admin highlight banner is active.</span>
            </article>
          )}
        </div>

        {homepageNotices.length > 0 && (
          <div className="menu-notice-grid">
            {homepageNotices.map((notice) => (
              <article key={notice.id} className={`menu-signal-card ${toneClassName(notice.tone)}`}>
                <strong>Notice</strong>
                <span>{notice.text}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="menu-overlay">
      <div
        className={`menu-card menu-card-rich ${specialTheme.confettiEnabled ? 'is-confetti' : ''} ${
          specialTheme.specialUiHighlights ? 'has-special-highlights' : ''
        } ${specialTheme.jonsmanThemeClass}`}
      >
        <div className="menu-header">
          <div>
            <p className="eyebrow">cs2aim</p>
            <h1>CS2AIM</h1>
            <p className="menu-subtitle">CS2 Aim trainer</p>
            <p className="menu-copy">Simple web based aim training for cs2.</p>
          </div>

          <div className="menu-tab-row">
            <button
              className={`menu-tab-button ${resolvedTab === 'play' ? 'is-active' : ''}`}
              type="button"
              onClick={handleTopPlayClick}
            >
              Play <HotkeyHint label={UI_KEYBINDS.startSelected.label} />
            </button>
            <button
              className={`menu-tab-button ${resolvedTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings <HotkeyHint label={UI_KEYBINDS.toggleSettings.label} />
            </button>
            {isAdmin && adminPanel && (
              <button
                className={`menu-tab-button ${resolvedTab === 'admin' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>

        {renderSiteSignals()}

        {resolvedTab === 'play' && (
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
                    <div className="leaderboard-name-line">
                      <strong className={isAdmin ? 'leaderboard-name-admin' : ''}>{accountName}</strong>
                      {isAdmin && adminBadgeVisible && (
                        <span className="leaderboard-admin-badge">Admin</span>
                      )}
                    </div>
                    <span className="progress-readout-detail">
                      Level {xp.level} / {formatLevelProgress(xp)}
                    </span>
                  </div>
                ) : (
                  <strong>Progression unavailable</strong>
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
              {modeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`mode-tile ${option.popular ? 'is-popular' : ''} ${
                    option.featured ? 'is-featured' : ''
                  } ${settings.selectedPeek === option.id ? 'is-active' : ''}`}
                  style={{ '--mode-highlight': option.highlightColor } as CSSProperties}
                  onClick={() => onSelectPeek(option.id)}
                >
                  {option.popular && <span className="mode-popular-badge">Popular</span>}
                  {option.experimental && <span className="mode-experimental-badge">Experimental</span>}
                  {option.featured && <span className="mode-featured-badge">Featured</span>}
                  <span className="mode-name">{PEEK_SELECTION_LABELS[option.id]}</span>
                  <span className="mode-copy">{option.description}</span>
                  <PeekPreviewArt peek={option.id} className={option.previewVariantClass} />
                </button>
              ))}
            </div>

            <div className="subheading-row menu-subheading">
              <span>Step 2: Choose the weapon before you start</span>
              <span>{WEAPON_LABELS[settings.weapon]}</span>
            </div>

            <div className="weapon-grid">
              {weaponOptions.map((option) => (
                <button
                  key={option.id}
                  className={`weapon-tile ${option.featured ? 'is-featured' : ''} ${
                    settings.weapon === option.id ? 'is-active' : ''
                  }`}
                  onClick={() => onSelectWeapon(option.id)}
                >
                  <span className="mode-name">{WEAPON_LABELS[option.id]}</span>
                  <span className="mode-copy">{WEAPON_PICKER_DETAILS[option.id].blurb}</span>
                  <WeaponPreviewArt weapon={option.id} />
                  <span className="weapon-rule">{WEAPON_PICKER_DETAILS[option.id].finishRule}</span>
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

            <FeedbackHub
              accountName={loggedInAccountName}
              posts={feedbackPosts}
              status={feedbackStatus}
              availability={feedbackAccess}
              onSubmitBugReport={onSubmitBugReport}
              onSubmitFeatureRequest={onSubmitFeatureRequest}
              onSubmitReview={onSubmitReview}
            />
          </>
        )}

        {resolvedTab === 'settings' && (
          <div className="menu-settings-shell">
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
            <div className="settings-account-shell">{renderAccountSettings()}</div>
          </div>
        )}

        {resolvedTab === 'admin' && adminPanel && <AdminPanel panel={adminPanel} />}

        <p className={`menu-footer menu-footer-${specialTheme.footerStyle}`}>
          {specialTheme.footerText}
        </p>
      </div>
    </div>
  )
}
