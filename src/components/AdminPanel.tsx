import { useMemo, useState } from 'react'
import {
  GRAPHICS_QUALITY_LABELS,
  GRAPHICS_QUALITY_OPTIONS,
  PEEK_SELECTION_LABELS,
  PEEK_SELECTIONS,
  PEEK_SPEED_LABELS,
  PEEK_SPEEDS,
  WEAPON_LABELS,
  WEAPON_SELECTIONS,
} from '../game/constants'
import type {
  AdminState,
  AnonymousProfile,
  AuthAccount,
  FeedbackPost,
  LifetimeStats,
  PeekSelection,
  PeekSpeedId,
  SessionHistoryEntry,
  WeaponMode,
} from '../game/types'

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'badges'
  | 'leaderboard'
  | 'progression'
  | 'modes'
  | 'visuals'
  | 'reports'
  | 'events'
  | 'moderation'
  | 'system'

export interface AdminPanelModel {
  status: { tone: 'good' | 'warn'; message: string } | null
  adminState: AdminState
  accounts: AuthAccount[]
  anonymousProfile: AnonymousProfile
  reports: FeedbackPost[]
  history: SessionHistoryEntry[]
  lifetime: LifetimeStats
  storageOverview: Array<{ key: string; bytes: number }>
  exports: {
    siteConfig: string
    leaderboard: string
    settings: string
  }
  dashboard: {
    totalPlayers: number
    totalRegisteredAccounts: number
    totalAnonymousPlayers: number
    totalShots: number
    totalKills: number
    totalHeadshots: number
    totalWallbangs: number
    averageReactionMs: number | null
    mostUsedWeapon: string
    mostPlayedMode: string
    latestBugReports: FeedbackPost[]
    latestFeatureRequests: FeedbackPost[]
    siteActivitySummary: string
  }
  actions: {
    runUserAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runBadgeAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runLeaderboardAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runProgressionAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runModeAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runVisualAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runReportAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runEventAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runSystemAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    clearStatus: () => void
  }
}

interface AdminPanelProps {
  panel: AdminPanelModel
}

const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'badges', label: 'Badges' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'progression', label: 'XP / Progression' },
  { id: 'modes', label: 'Modes / Gameplay' },
  { id: 'visuals', label: 'Visuals / Fun' },
  { id: 'reports', label: 'Reports' },
  { id: 'events', label: 'Events' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'system', label: 'System' },
]

const REPORT_STATUS_OPTIONS: FeedbackPost['status'][] = [
  'open',
  'reviewed',
  'fixed',
  'planned',
  'rejected',
  'added',
]

const formatDate = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)

const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

const confirmDanger = (message: string) => window.confirm(message)

export function AdminPanel({ panel }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [userSearch, setUserSearch] = useState('')
  const filteredUsers = useMemo(
    () =>
      panel.accounts.filter((account) =>
        account.name.toLowerCase().includes(userSearch.trim().toLowerCase()),
      ),
    [panel.accounts, userSearch],
  )
  const [selectedUser, setSelectedUser] = useState(panel.accounts[0]?.name ?? '')
  const [renameValue, setRenameValue] = useState('')
  const [xpDelta, setXpDelta] = useState('500')
  const [levelValue, setLevelValue] = useState('10')
  const [userNote, setUserNote] = useState('')
  const [nameColor, setNameColor] = useState('#72f0c4')
  const [rateLimitMinutes, setRateLimitMinutes] = useState('120')
  const [anonymousAlias, setAnonymousAlias] = useState(panel.anonymousProfile.alias ?? '')
  const [selectedBadgeId, setSelectedBadgeId] = useState(panel.adminState.badges[0]?.id ?? '')
  const [badgeName, setBadgeName] = useState('')
  const [badgeColor, setBadgeColor] = useState('#72f0c4')
  const [badgeStyle, setBadgeStyle] = useState<'solid' | 'outline' | 'glow'>('solid')
  const [selectedBotId, setSelectedBotId] = useState(panel.adminState.bots[0]?.id ?? '')
  const [botName, setBotName] = useState('')
  const [botXp, setBotXp] = useState('25000')
  const [botKills, setBotKills] = useState('300')
  const [botHeadshots, setBotHeadshots] = useState('140')
  const [botWallbangs, setBotWallbangs] = useState('40')
  const [botAverage, setBotAverage] = useState('310')
  const [botBulkCount, setBotBulkCount] = useState('4')
  const [botTheme, setBotTheme] = useState('pros')
  const [selectedMode, setSelectedMode] = useState<PeekSelection>('cross')
  const [modeDescription, setModeDescription] = useState(
    panel.adminState.modeConfigs.cross.description,
  )
  const [modeHighlightColor, setModeHighlightColor] = useState(
    panel.adminState.modeConfigs.cross.highlightColor,
  )
  const [modeDifficultyMultiplier, setModeDifficultyMultiplier] = useState('1')
  const [shellLabel, setShellLabel] = useState('')
  const [shellDescription, setShellDescription] = useState('')
  const [delayMin, setDelayMin] = useState(`${panel.adminState.globalPeekDelayMinMs}`)
  const [delayMax, setDelayMax] = useState(`${panel.adminState.globalPeekDelayMaxMs}`)
  const [speedMultiplier, setSpeedMultiplier] = useState('1')
  const [selectedSpeed, setSelectedSpeed] = useState<PeekSpeedId>('normal')
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponMode>('awp')
  const [weaponCooldown, setWeaponCooldown] = useState(
    `${panel.adminState.weaponConfigs.awp.cooldownMs}`,
  )
  const [xpMultiplier, setXpMultiplier] = useState(`${panel.adminState.xpMultiplier}`)
  const [maxXpPerShot, setMaxXpPerShot] = useState(`${panel.adminState.maxXpPerShot}`)
  const [levelBaseXp, setLevelBaseXp] = useState(`${panel.adminState.levelBaseXp}`)
  const [levelStepXp, setLevelStepXp] = useState(`${panel.adminState.levelStepXp}`)
  const [bonusEventMultiplier, setBonusEventMultiplier] = useState(
    `${panel.adminState.bonusXpEventMultiplier}`,
  )
  const [modeXpBonus, setModeXpBonus] = useState(`${panel.adminState.modeXpBonuses.cross}`)
  const [weaponXpBonus, setWeaponXpBonus] = useState(
    `${panel.adminState.weaponXpBonuses.awp}`,
  )
  const [grantGlobalXp, setGrantGlobalXp] = useState('1000')
  const [bannerText, setBannerText] = useState(panel.adminState.announcementBannerText)
  const [featuredMessage, setFeaturedMessage] = useState(panel.adminState.featuredMessage)
  const [noticeText, setNoticeText] = useState('')
  const [buttonAccent, setButtonAccent] = useState(panel.adminState.buttonAccentColor)
  const [fakeAnnouncementText, setFakeAnnouncementText] = useState(
    panel.adminState.fakeAnnouncementText,
  )
  const [goofyEventTitle, setGoofyEventTitle] = useState(panel.adminState.goofyEventTitle)
  const [fakeChallenge, setFakeChallenge] = useState(panel.adminState.fakeGlobalChallenge)
  const [footerTrollText, setFooterTrollText] = useState(panel.adminState.footerTrollText)
  const [selectedReportId, setSelectedReportId] = useState(panel.reports[0]?.id ?? '')
  const [reportStatus, setReportStatus] = useState<FeedbackPost['status']>('open')
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementHours, setAnnouncementHours] = useState('0')
  const [lobbyMessage, setLobbyMessage] = useState(panel.adminState.lobbyMessage)
  const [refreshInterval, setRefreshInterval] = useState(
    `${panel.adminState.leaderboardAutoRefreshSeconds}`,
  )
  const [importPayload, setImportPayload] = useState('')
  const [blockedWordsText, setBlockedWordsText] = useState(
    panel.adminState.blockedWords.join('\n'),
  )
  const handleUserSelect = (name: string) => {
    const account = panel.accounts.find((entry) => entry.name === name)
    setSelectedUser(name)
    if (!account) {
      return
    }

    setRenameValue(account.name)
    setNameColor(account.nameColor ?? '#72f0c4')
    setRateLimitMinutes(`${account.strictFeedbackCooldownMinutes ?? 60}`)
  }

  const handleModeSelect = (peek: PeekSelection) => {
    const config = panel.adminState.modeConfigs[peek]
    setSelectedMode(peek)
    setModeDescription(config.description)
    setModeHighlightColor(config.highlightColor)
    setModeDifficultyMultiplier(`${config.difficultyMultiplier}`)
    setModeXpBonus(`${panel.adminState.modeXpBonuses[peek]}`)
  }

  const handleWeaponSelect = (weapon: WeaponMode) => {
    setSelectedWeapon(weapon)
    setWeaponCooldown(`${panel.adminState.weaponConfigs[weapon].cooldownMs}`)
    setWeaponXpBonus(`${panel.adminState.weaponXpBonuses[weapon]}`)
  }

  const handleSpeedSelect = (speed: PeekSpeedId) => {
    setSelectedSpeed(speed)
    setSpeedMultiplier(`${panel.adminState.speedConfigs[speed].multiplier}`)
  }

  const handleBotLoad = (botId: string) => {
    const bot = panel.adminState.bots.find((entry) => entry.id === botId)
    setSelectedBotId(botId)
    if (!bot) {
      return
    }

    setBotName(bot.name)
    setBotXp(`${bot.xp}`)
    setBotKills(`${bot.stats.kills}`)
    setBotHeadshots(`${bot.stats.headshots}`)
    setBotWallbangs(`${bot.stats.wallbangs}`)
    setBotAverage(
      `${
        bot.stats.qualifyingReactionCount > 0
          ? Math.round(bot.stats.qualifyingReactionMs / bot.stats.qualifyingReactionCount)
          : 300
      }`,
    )
  }

  const handleReportLoad = (reportId: string) => {
    const report = panel.reports.find((entry) => entry.id === reportId)
    setSelectedReportId(reportId)
    if (report) {
      setReportStatus(report.status)
    }
  }

  const selectedAccount =
    panel.accounts.find((account) => account.name === selectedUser) ??
    filteredUsers[0] ??
    panel.accounts[0] ??
    null
  const selectedBot =
    panel.adminState.bots.find((bot) => bot.id === selectedBotId) ??
    panel.adminState.bots[0] ??
    null
  const selectedReport =
    panel.reports.find((post) => post.id === selectedReportId) ??
    panel.reports[0] ??
    null

  return (
    <section className="panel admin-panel-shell">
      <div className="panel-header admin-panel-header">
        <div>
          <p className="eyebrow">Restricted Controls</p>
          <h2>
            <span className="leaderboard-name-admin">Jonsman</span> Admin Panel
          </h2>
        </div>
        <span className="leaderboard-admin-badge">Admin</span>
      </div>

      <p className="menu-copy">
        Hidden for normal users. Every tool here writes to the real local site state and important
        actions are recorded in the audit log.
      </p>

      {panel.status && (
        <div className={`feedback-status feedback-status-${panel.status.tone}`}>
          <strong>{panel.status.message}</strong>
          <div className="menu-actions admin-inline-actions">
            <button className="ghost-button" onClick={panel.actions.clearStatus}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="segment-grid segment-grid-peeks admin-tab-grid">
        {ADMIN_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`segment-button ${activeSection === section.id ? 'is-active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'dashboard' && (
        <div className="admin-section-stack">
          <div className="menu-meta admin-metric-grid">
            <div>
              <span>Total Players</span>
              <strong>{panel.dashboard.totalPlayers}</strong>
            </div>
            <div>
              <span>Registered Accounts</span>
              <strong>{panel.dashboard.totalRegisteredAccounts}</strong>
            </div>
            <div>
              <span>Anonymous Players</span>
              <strong>{panel.dashboard.totalAnonymousPlayers}</strong>
            </div>
            <div>
              <span>Total Shots</span>
              <strong>{panel.dashboard.totalShots.toLocaleString()}</strong>
            </div>
            <div>
              <span>Total Kills</span>
              <strong>{panel.dashboard.totalKills.toLocaleString()}</strong>
            </div>
            <div>
              <span>Total Headshots</span>
              <strong>{panel.dashboard.totalHeadshots.toLocaleString()}</strong>
            </div>
            <div>
              <span>Total Wallbangs</span>
              <strong>{panel.dashboard.totalWallbangs.toLocaleString()}</strong>
            </div>
            <div>
              <span>Avg Reaction</span>
              <strong>
                {panel.dashboard.averageReactionMs === null
                  ? '--'
                  : `${Math.round(panel.dashboard.averageReactionMs)} ms`}
              </strong>
            </div>
            <div>
              <span>Most Used Weapon</span>
              <strong>{panel.dashboard.mostUsedWeapon.toUpperCase()}</strong>
            </div>
            <div>
              <span>Most Played Mode</span>
              <strong>{panel.dashboard.mostPlayedMode}</strong>
            </div>
            <div>
              <span>Site Activity</span>
              <strong>{panel.dashboard.siteActivitySummary}</strong>
            </div>
          </div>

          <div className="feedback-grid">
            <section className="feedback-card panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Latest</p>
                  <h2>Bug Reports</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.dashboard.latestBugReports.length > 0 ? (
                  panel.dashboard.latestBugReports.map((post) => (
                    <article key={post.id} className="feedback-post">
                      <div className="feedback-post-meta">
                        <strong>{post.authorName}</strong>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      <p>{post.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="empty-copy">No bug reports yet.</p>
                )}
              </div>
            </section>

            <section className="feedback-card panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Latest</p>
                  <h2>Feature Requests</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.dashboard.latestFeatureRequests.length > 0 ? (
                  panel.dashboard.latestFeatureRequests.map((post) => (
                    <article key={post.id} className="feedback-post">
                      <div className="feedback-post-meta">
                        <strong>{post.authorName}</strong>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      <p>{post.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="empty-copy">No feature requests yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeSection === 'users' && (
        <div className="admin-section-stack">
          <div className="auth-form">
            <label>
              <span>Search Users</span>
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            </label>
          </div>

          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Accounts</p>
                  <h2>User Picker</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {filteredUsers.map((account) => (
                  <button
                    key={account.name}
                    className={`segment-button ${selectedUser === account.name ? 'is-active' : ''}`}
                    onClick={() => handleUserSelect(account.name)}
                    type="button"
                  >
                    {account.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Selected</p>
                  <h2>User Profile</h2>
                </div>
              </div>
              {selectedAccount ? (
                <>
                  <div className="menu-meta admin-metric-grid">
                    <div>
                      <span>User</span>
                      <strong>{selectedAccount.name}</strong>
                    </div>
                    <div>
                      <span>XP</span>
                      <strong>{selectedAccount.xp.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Kills</span>
                      <strong>{selectedAccount.stats.kills.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Badges</span>
                      <strong>{selectedAccount.badges.length}</strong>
                    </div>
                  </div>

                  <div className="auth-form">
                    <label>
                      <span>Rename User</span>
                      <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                    </label>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="primary-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'rename',
                            userName: selectedAccount.name,
                            value: renameValue,
                          })
                        }
                      >
                        Rename User
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'force-rename',
                            userName: selectedAccount.name,
                          })
                        }
                      >
                        Force Rename
                      </button>
                    </div>

                    <label>
                      <span>XP Value</span>
                      <input value={xpDelta} onChange={(event) => setXpDelta(event.target.value)} />
                    </label>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="primary-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'add-xp',
                            userName: selectedAccount.name,
                            value: xpDelta,
                          })
                        }
                      >
                        Add XP
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'remove-xp',
                            userName: selectedAccount.name,
                            value: xpDelta,
                          })
                        }
                      >
                        Remove XP
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'reset-xp',
                            userName: selectedAccount.name,
                          })
                        }
                      >
                        Reset XP
                      </button>
                    </div>

                    <label>
                      <span>Set Level Directly</span>
                      <input value={levelValue} onChange={(event) => setLevelValue(event.target.value)} />
                    </label>
                    <button
                      className="primary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'set-level',
                          userName: selectedAccount.name,
                          value: levelValue,
                        })
                      }
                    >
                      Set Level
                    </button>

                    <label>
                      <span>Name Color</span>
                      <input type="color" value={nameColor} onChange={(event) => setNameColor(event.target.value)} />
                    </label>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="primary-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'set-name-color',
                            userName: selectedAccount.name,
                            value: nameColor,
                          })
                        }
                      >
                        Set Name Color
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'set-name-color',
                            userName: selectedAccount.name,
                            value: '',
                          })
                        }
                      >
                        Clear Color
                      </button>
                    </div>

                    <label>
                      <span>Strict Feedback Cooldown Minutes</span>
                      <input
                        value={rateLimitMinutes}
                        onChange={(event) => setRateLimitMinutes(event.target.value)}
                      />
                    </label>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'set-rate-limit',
                          userName: selectedAccount.name,
                          value: rateLimitMinutes,
                        })
                      }
                    >
                      Set Rate Limit
                    </button>

                    <label>
                      <span>Admin Note</span>
                      <textarea
                        rows={3}
                        value={userNote}
                        onChange={(event) => setUserNote(event.target.value)}
                      />
                    </label>
                    <button
                      className="primary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'add-note',
                          userName: selectedAccount.name,
                          value: userNote,
                        })
                      }
                    >
                      Add Admin Note
                    </button>

                    <label>
                      <span>Badge Assignment</span>
                      <select
                        value={selectedBadgeId}
                        onChange={(event) => setSelectedBadgeId(event.target.value)}
                      >
                        {panel.adminState.badges.map((badge) => (
                          <option key={badge.id} value={badge.id}>
                            {badge.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'add-badge',
                            userName: selectedAccount.name,
                            badgeId: selectedBadgeId,
                          })
                        }
                      >
                        Give Badge
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runUserAdminAction({
                            type: 'remove-badge',
                            userName: selectedAccount.name,
                            badgeId: selectedBadgeId,
                          })
                        }
                      >
                        Remove Badge
                      </button>
                    </div>
                  </div>

                  <div className="menu-actions admin-inline-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'feature',
                          userName: selectedAccount.name,
                          value: !selectedAccount.featured,
                        })
                      }
                    >
                      {selectedAccount.featured ? 'Unfeature User' : 'Feature User'}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'hide-user',
                          userName: selectedAccount.name,
                          value: !selectedAccount.hiddenFromLeaderboard,
                        })
                      }
                    >
                      {selectedAccount.hiddenFromLeaderboard
                        ? 'Show On Leaderboard'
                        : 'Hide From Leaderboard'}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'suspend',
                          userName: selectedAccount.name,
                          value: !selectedAccount.suspended,
                        })
                      }
                    >
                      {selectedAccount.suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'ban',
                          userName: selectedAccount.name,
                          value: !selectedAccount.banned,
                        })
                      }
                    >
                      {selectedAccount.banned ? 'Unban' : 'Ban'}
                    </button>
                  </div>

                  <div className="menu-actions admin-inline-actions">
                    <button
                      className="secondary-button"
                      onClick={() =>
                        confirmDanger(`Reset ${selectedAccount.name}'s combat stats?`) &&
                        panel.actions.runUserAdminAction({
                          type: 'reset-stats',
                          userName: selectedAccount.name,
                        })
                      }
                    >
                      Reset Stats
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        panel.actions.runUserAdminAction({
                          type: 'force-refresh',
                          userName: selectedAccount.name,
                        })
                      }
                    >
                      Force Refresh
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        confirmDanger(`Delete ${selectedAccount.name}'s account?`) &&
                        panel.actions.runUserAdminAction({
                          type: 'delete-account',
                          userName: selectedAccount.name,
                        })
                      }
                    >
                      Delete Account
                    </button>
                  </div>

                  <div className="feedback-post-list">
                    {selectedAccount.adminNotes.length > 0 ? (
                      selectedAccount.adminNotes.map((note) => (
                        <article key={`${selectedAccount.name}-${note}`} className="feedback-post">
                          <div className="feedback-post-meta">
                            <strong>Admin Note</strong>
                            <span>{selectedAccount.name}</span>
                          </div>
                          <p>{note}</p>
                        </article>
                      ))
                    ) : (
                      <p className="empty-copy">No admin notes saved for this user yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-copy">No matching user selected.</p>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Anonymous</p>
                <h2>Guest Progression</h2>
              </div>
            </div>
            <div className="menu-meta admin-metric-grid">
              <div>
                <span>Display Name</span>
                <strong>{panel.anonymousProfile.alias ?? `Anonymous ${panel.anonymousProfile.id}`}</strong>
              </div>
              <div>
                <span>XP</span>
                <strong>{panel.anonymousProfile.xp.toLocaleString()}</strong>
              </div>
              <div>
                <span>Kills</span>
                <strong>{panel.anonymousProfile.stats.kills.toLocaleString()}</strong>
              </div>
              <div>
                <span>Headshots</span>
                <strong>{panel.anonymousProfile.stats.headshots.toLocaleString()}</strong>
              </div>
            </div>
            <div className="auth-form">
              <label>
                <span>Anonymous Alias</span>
                <input
                  value={anonymousAlias}
                  onChange={(event) => setAnonymousAlias(event.target.value)}
                />
              </label>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runUserAdminAction({
                      type: 'rename-anonymous',
                      value: anonymousAlias,
                    })
                  }
                >
                  Save Alias
                </button>
                {selectedAccount && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      confirmDanger(`Merge anonymous progression into ${selectedAccount.name}?`) &&
                      panel.actions.runUserAdminAction({
                        type: 'merge-anonymous',
                        userName: selectedAccount.name,
                      })
                    }
                  >
                    Merge Into {selectedAccount.name}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'badges' && (
        <div className="admin-section-stack">
          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Create</p>
                  <h2>Custom Badges</h2>
                </div>
              </div>
              <div className="auth-form">
                <label>
                  <span>Badge Name</span>
                  <input value={badgeName} onChange={(event) => setBadgeName(event.target.value)} />
                </label>
                <label>
                  <span>Badge Color</span>
                  <input type="color" value={badgeColor} onChange={(event) => setBadgeColor(event.target.value)} />
                </label>
                <label>
                  <span>Badge Style</span>
                  <select value={badgeStyle} onChange={(event) => setBadgeStyle(event.target.value as typeof badgeStyle)}>
                    <option value="solid">Solid</option>
                    <option value="outline">Outline</option>
                    <option value="glow">Glow</option>
                  </select>
                </label>
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runBadgeAdminAction({
                      type: 'create',
                      name: badgeName,
                      color: badgeColor,
                      style: badgeStyle,
                    })
                  }
                >
                  Create Badge
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Manage</p>
                  <h2>Existing Badges</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.adminState.badges.map((badge) => (
                  <article key={badge.id} className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{badge.name}</strong>
                      <span>{badge.style}</span>
                    </div>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelectedBadgeId(badge.id)
                          setBadgeName(badge.name)
                          setBadgeColor(badge.color)
                          setBadgeStyle(badge.style)
                        }}
                      >
                        Load
                      </button>
                      <button
                        className="primary-button"
                        onClick={() =>
                          panel.actions.runBadgeAdminAction({
                            type: 'update',
                            badgeId: badge.id,
                            name: badgeName || badge.name,
                            color: badgeColor,
                            style: badgeStyle,
                          })
                        }
                      >
                        Save
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          confirmDanger(`Delete badge ${badge.name}?`) &&
                          panel.actions.runBadgeAdminAction({
                            type: 'delete',
                            badgeId: badge.id,
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runBadgeAdminAction({
                      type: 'toggle-admin-visibility',
                      value: !panel.adminState.adminBadgeVisible,
                    })
                  }
                >
                  {panel.adminState.adminBadgeVisible ? 'Hide Admin Badge' : 'Show Admin Badge'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeSection === 'leaderboard' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Bots</p>
                <h2>Leaderboard Bots</h2>
              </div>
            </div>
            <div className="feedback-post-list">
              {panel.adminState.bots.length > 0 ? (
                panel.adminState.bots.map((bot) => (
                  <button
                    key={bot.id}
                    className={`segment-button ${selectedBot?.id === bot.id ? 'is-active' : ''}`}
                    onClick={() => handleBotLoad(bot.id)}
                    type="button"
                  >
                    {bot.name}
                  </button>
                ))
              ) : (
                <p className="empty-copy">No leaderboard bots configured yet.</p>
              )}
            </div>
            <div className="auth-form">
              <label>
                <span>Bot Name</span>
                <input value={botName} onChange={(event) => setBotName(event.target.value)} />
              </label>
              <div className="settings-grid">
                <label>
                  <span>XP</span>
                  <input value={botXp} onChange={(event) => setBotXp(event.target.value)} />
                </label>
                <label>
                  <span>Kills</span>
                  <input value={botKills} onChange={(event) => setBotKills(event.target.value)} />
                </label>
                <label>
                  <span>Headshots</span>
                  <input value={botHeadshots} onChange={(event) => setBotHeadshots(event.target.value)} />
                </label>
                <label>
                  <span>Wallbangs</span>
                  <input value={botWallbangs} onChange={(event) => setBotWallbangs(event.target.value)} />
                </label>
                <label>
                  <span>Avg Reaction</span>
                  <input value={botAverage} onChange={(event) => setBotAverage(event.target.value)} />
                </label>
              </div>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({
                      type: 'add-bot',
                      name: botName,
                      xp: botXp,
                      kills: botKills,
                      headshots: botHeadshots,
                      wallbangs: botWallbangs,
                      averageReactionMs: botAverage,
                    })
                  }
                >
                  Add Bot
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({
                      type: 'update-bot',
                      botId: selectedBotId,
                      name: botName,
                      xp: botXp,
                      kills: botKills,
                      headshots: botHeadshots,
                      wallbangs: botWallbangs,
                      averageReactionMs: botAverage,
                      nameColor: selectedBot?.nameColor ?? null,
                      theme: botTheme,
                    })
                  }
                >
                  Update Bot
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    selectedBotId &&
                    panel.actions.runLeaderboardAdminAction({
                      type: 'remove-bot',
                      botId: selectedBotId,
                    })
                  }
                >
                  Remove Bot
                </button>
              </div>
              {selectedBot && (
                <div className="menu-actions admin-inline-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      panel.actions.runLeaderboardAdminAction({
                        type: 'update-bot',
                        botId: selectedBot.id,
                        locked: !selectedBot.locked,
                      })
                    }
                  >
                    {selectedBot.locked ? 'Unlock Bot Stats' : 'Lock Bot Stats'}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      panel.actions.runLeaderboardAdminAction({
                        type: 'update-bot',
                        botId: selectedBot.id,
                        featured: !selectedBot.featured,
                      })
                    }
                  >
                    {selectedBot.featured ? 'Unfeature Bot' : 'Feature Bot'}
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      panel.actions.runLeaderboardAdminAction({
                        type: 'update-bot',
                        botId: selectedBot.id,
                        hidden: !selectedBot.hidden,
                      })
                    }
                  >
                    {selectedBot.hidden ? 'Show Bot' : 'Hide Bot'}
                  </button>
                </div>
              )}
              <div className="menu-actions admin-inline-actions">
                <input
                  value={botBulkCount}
                  onChange={(event) => setBotBulkCount(event.target.value)}
                />
                <select value={botTheme} onChange={(event) => setBotTheme(event.target.value)}>
                  <option value="pros">Pro Set</option>
                  <option value="midlane">Midlane Set</option>
                  <option value="meme">Meme Set</option>
                </select>
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({
                      type: 'bulk-add-bots',
                      count: botBulkCount,
                      theme: botTheme,
                    })
                  }
                >
                  Add Multiple Bots
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({ type: 'randomize-bots' })
                  }
                >
                  Randomize Bots
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    confirmDanger('Remove all leaderboard bots?') &&
                    panel.actions.runLeaderboardAdminAction({ type: 'clear-bots' })
                  }
                >
                  Remove All Bots
                </button>
              </div>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({
                      type: 'power-shift',
                      value: 'stronger',
                    })
                  }
                >
                  Make Bots Stronger
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    panel.actions.runLeaderboardAdminAction({
                      type: 'power-shift',
                      value: 'weaker',
                    })
                  }
                >
                  Make Bots Weaker
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Refresh</p>
                <h2>Leaderboard Controls</h2>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>Auto Refresh Seconds</span>
                <input
                  value={refreshInterval}
                  onChange={(event) => setRefreshInterval(event.target.value)}
                />
              </label>
              <label>
                <span>Selected User</span>
                <input value={selectedAccount?.name ?? ''} readOnly />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runLeaderboardAdminAction({
                    type: 'set-refresh-interval',
                    value: refreshInterval,
                  })
                }
              >
                Save Refresh Interval
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runUserAdminAction({ type: 'force-refresh', userName: '' })
                }
              >
                Force Refresh Now
              </button>
              {selectedAccount && (
                <>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      panel.actions.runLeaderboardAdminAction({
                        type: 'toggle-highlight',
                        value: selectedAccount.name,
                      })
                    }
                  >
                    Toggle Highlight
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      panel.actions.runLeaderboardAdminAction({
                        type: 'toggle-pin',
                        value: selectedAccount.name,
                      })
                    }
                  >
                    Toggle Pin
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
      {activeSection === 'progression' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">XP Rules</p>
                <h2>Progression Tuning</h2>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>XP Multiplier</span>
                <input value={xpMultiplier} onChange={(event) => setXpMultiplier(event.target.value)} />
              </label>
              <label>
                <span>Max XP Per Shot</span>
                <input value={maxXpPerShot} onChange={(event) => setMaxXpPerShot(event.target.value)} />
              </label>
              <label>
                <span>Level Base XP</span>
                <input value={levelBaseXp} onChange={(event) => setLevelBaseXp(event.target.value)} />
              </label>
              <label>
                <span>Level Step XP</span>
                <input value={levelStepXp} onChange={(event) => setLevelStepXp(event.target.value)} />
              </label>
              <label>
                <span>Bonus XP Event Multiplier</span>
                <input
                  value={bonusEventMultiplier}
                  onChange={(event) => setBonusEventMultiplier(event.target.value)}
                />
              </label>
            </div>
            <div className="menu-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runProgressionAdminAction({
                    type: 'set-xp-config',
                    xpMultiplier,
                    maxXpPerShot,
                    levelBaseXp,
                    levelStepXp,
                    bonusXpEventMultiplier: bonusEventMultiplier,
                  })
                }
              >
                Save XP Config
              </button>
            </div>
            <div className="settings-grid">
              <label>
                <span>Mode</span>
                <select value={selectedMode} onChange={(event) => handleModeSelect(event.target.value as PeekSelection)}>
                  {PEEK_SELECTIONS.map((peek) => (
                    <option key={peek} value={peek}>
                      {PEEK_SELECTION_LABELS[peek]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Mode XP Bonus</span>
                <input value={modeXpBonus} onChange={(event) => setModeXpBonus(event.target.value)} />
              </label>
              <label>
                <span>Weapon</span>
                <select value={selectedWeapon} onChange={(event) => handleWeaponSelect(event.target.value as WeaponMode)}>
                  {WEAPON_SELECTIONS.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {WEAPON_LABELS[weapon]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Weapon XP Bonus</span>
                <input value={weaponXpBonus} onChange={(event) => setWeaponXpBonus(event.target.value)} />
              </label>
              <label>
                <span>Grant XP To All</span>
                <input value={grantGlobalXp} onChange={(event) => setGrantGlobalXp(event.target.value)} />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runProgressionAdminAction({
                    type: 'set-mode-xp-bonus',
                    peek: selectedMode,
                    value: modeXpBonus,
                  })
                }
              >
                Save Mode Bonus
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runProgressionAdminAction({
                    type: 'set-weapon-xp-bonus',
                    weapon: selectedWeapon,
                    value: weaponXpBonus,
                  })
                }
              >
                Save Weapon Bonus
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runProgressionAdminAction({
                    type: 'grant-global-xp',
                    value: grantGlobalXp,
                  })
                }
              >
                Grant Global XP
              </button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="ghost-button"
                onClick={() =>
                  confirmDanger('Reset all progression?') &&
                  panel.actions.runProgressionAdminAction({ type: 'reset-all-progression' })
                }
              >
                Reset All Progression
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  confirmDanger('Reset leaderboard stats only?') &&
                  panel.actions.runProgressionAdminAction({ type: 'reset-leaderboard-stats' })
                }
              >
                Reset Leaderboard Stats
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  confirmDanger('Reset reaction stats only?') &&
                  panel.actions.runProgressionAdminAction({ type: 'reset-reaction-stats' })
                }
              >
                Reset Reaction Stats
              </button>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'modes' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Modes</p>
                <h2>Mode Cards And Gameplay</h2>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>Selected Mode</span>
                <select value={selectedMode} onChange={(event) => handleModeSelect(event.target.value as PeekSelection)}>
                  {PEEK_SELECTIONS.map((peek) => (
                    <option key={peek} value={peek}>
                      {PEEK_SELECTION_LABELS[peek]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea rows={3} value={modeDescription} onChange={(event) => setModeDescription(event.target.value)} />
              </label>
              <label>
                <span>Highlight Color</span>
                <input type="color" value={modeHighlightColor} onChange={(event) => setModeHighlightColor(event.target.value)} />
              </label>
              <label>
                <span>Difficulty Multiplier</span>
                <input
                  value={modeDifficultyMultiplier}
                  onChange={(event) => setModeDifficultyMultiplier(event.target.value)}
                />
              </label>
              <label>
                <span>Preview Variant</span>
                <select
                  value={panel.adminState.modeConfigs[selectedMode].previewVariant}
                  onChange={(event) =>
                    panel.actions.runModeAdminAction({
                      type: 'update-mode',
                      peek: selectedMode,
                      previewVariant: event.target.value,
                    })
                  }
                >
                  <option value="default">default</option>
                  <option value="scan">scan</option>
                  <option value="ghost">ghost</option>
                  <option value="warm">warm</option>
                  <option value="blueprint">blueprint</option>
                </select>
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'update-mode',
                    peek: selectedMode,
                    description: modeDescription,
                    highlightColor: modeHighlightColor,
                    difficultyMultiplier: modeDifficultyMultiplier,
                  })
                }
              >
                Save Mode
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'update-mode',
                    peek: selectedMode,
                    enabled: !panel.adminState.modeConfigs[selectedMode].enabled,
                  })
                }
              >
                {panel.adminState.modeConfigs[selectedMode].enabled ? 'Disable Mode' : 'Enable Mode'}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'update-mode',
                    peek: selectedMode,
                    popular: !panel.adminState.modeConfigs[selectedMode].popular,
                  })
                }
              >
                {panel.adminState.modeConfigs[selectedMode].popular ? 'Unmark Popular' : 'Mark Popular'}
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({ type: 'move-mode', peek: selectedMode, value: 'up' })
                }
              >
                Move Up
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({ type: 'move-mode', peek: selectedMode, value: 'down' })
                }
              >
                Move Down
              </button>
            </div>
            <div className="settings-grid">
              <label>
                <span>Global Delay Min</span>
                <input value={delayMin} onChange={(event) => setDelayMin(event.target.value)} />
              </label>
              <label>
                <span>Global Delay Max</span>
                <input value={delayMax} onChange={(event) => setDelayMax(event.target.value)} />
              </label>
              <label>
                <span>Speed Preset</span>
                <select value={selectedSpeed} onChange={(event) => handleSpeedSelect(event.target.value as PeekSpeedId)}>
                  {PEEK_SPEEDS.map((speed) => (
                    <option key={speed} value={speed}>
                      {PEEK_SPEED_LABELS[speed]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Speed Multiplier</span>
                <input value={speedMultiplier} onChange={(event) => setSpeedMultiplier(event.target.value)} />
              </label>
              <label>
                <span>Weapon</span>
                <select value={selectedWeapon} onChange={(event) => handleWeaponSelect(event.target.value as WeaponMode)}>
                  {WEAPON_SELECTIONS.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {WEAPON_LABELS[weapon]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Weapon Cooldown</span>
                <input value={weaponCooldown} onChange={(event) => setWeaponCooldown(event.target.value)} />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-global-delays',
                    min: delayMin,
                    max: delayMax,
                  })
                }
              >
                Save Global Delays
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-speed-multiplier',
                    speed: selectedSpeed,
                    value: speedMultiplier,
                  })
                }
              >
                Save Speed Multiplier
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-weapon-cooldown',
                    weapon: selectedWeapon,
                    value: weaponCooldown,
                  })
                }
              >
                Save Weapon Cooldown
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-weapon-enabled',
                    weapon: selectedWeapon,
                    value: !panel.adminState.weaponConfigs[selectedWeapon].enabled,
                  })
                }
              >
                {panel.adminState.weaponConfigs[selectedWeapon].enabled ? 'Disable Weapon' : 'Enable Weapon'}
              </button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-default-wallhack',
                    value: !panel.adminState.defaultWallhackEnabled,
                  })
                }
              >
                Wallhack Default: {panel.adminState.defaultWallhackEnabled ? 'On' : 'Off'}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-experimental-modes',
                    value: !panel.adminState.experimentalModesEnabled,
                  })
                }
              >
                Experimental: {panel.adminState.experimentalModesEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="settings-grid">
              <label>
                <span>Round Start Min Enemies</span>
                <input value={panel.adminState.roundStartMinEnemies} readOnly />
              </label>
              <label>
                <span>Round Start Max Enemies</span>
                <input value={panel.adminState.roundStartMaxEnemies} readOnly />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-round-start-limits',
                    min: 2,
                    max: 4,
                  })
                }
              >
                Reset Round Start To 2-4
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'set-round-start-limits',
                    min: Math.max(1, panel.adminState.roundStartMinEnemies - 1),
                    max: Math.max(2, panel.adminState.roundStartMaxEnemies + 1),
                  })
                }
              >
                Widen Round Start Range
              </button>
            </div>
            <div className="segment-grid segment-grid-short">
              {GRAPHICS_QUALITY_OPTIONS.map((quality) => (
                <button
                  key={quality}
                  className={`segment-button ${
                    panel.adminState.defaultQualityPreset === quality ? 'is-active' : ''
                  }`}
                  onClick={() =>
                    panel.actions.runModeAdminAction({
                      type: 'set-default-quality',
                      value: quality,
                    })
                  }
                >
                  {GRAPHICS_QUALITY_LABELS[quality]}
                </button>
              ))}
            </div>
            <div className="auth-form">
              <label>
                <span>Mode Shell Label</span>
                <input value={shellLabel} onChange={(event) => setShellLabel(event.target.value)} />
              </label>
              <label>
                <span>Mode Shell Description</span>
                <textarea rows={3} value={shellDescription} onChange={(event) => setShellDescription(event.target.value)} />
              </label>
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runModeAdminAction({
                    type: 'create-shell',
                    label: shellLabel,
                    description: shellDescription,
                  })
                }
              >
                Create Mode Shell
              </button>
            </div>
            <div className="feedback-post-list">
              {panel.adminState.modeShells.length > 0 ? (
                panel.adminState.modeShells.map((shell) => (
                  <article key={shell.id} className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{shell.label}</strong>
                      <span>{shell.previewVariant}</span>
                    </div>
                    <p>{shell.description}</p>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runModeAdminAction({
                            type: 'remove-shell',
                            id: shell.id,
                          })
                        }
                      >
                        Remove Shell
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">No custom mode shells yet.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {activeSection === 'visuals' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Homepage</p>
                <h2>Messages And Theme</h2>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>Announcement Banner</span>
                <input value={bannerText} onChange={(event) => setBannerText(event.target.value)} />
              </label>
              <label>
                <span>Featured Message</span>
                <input
                  value={featuredMessage}
                  onChange={(event) => setFeaturedMessage(event.target.value)}
                />
              </label>
              <label>
                <span>Button Accent</span>
                <input
                  type="color"
                  value={buttonAccent}
                  onChange={(event) => setButtonAccent(event.target.value)}
                />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({ type: 'set-banner', value: bannerText })
                }
              >
                Save Banner
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-featured-message',
                    value: featuredMessage,
                  })
                }
              >
                Save Featured Message
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-button-accent',
                    value: buttonAccent,
                  })
                }
              >
                Save Accent
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'toggle-jonsman-theme',
                    value: !panel.adminState.jonsmanThemeEnabled,
                  })
                }
              >
                Jonsman Theme: {panel.adminState.jonsmanThemeEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'toggle-special-highlights',
                    value: !panel.adminState.specialUiHighlights,
                  })
                }
              >
                Special Highlights: {panel.adminState.specialUiHighlights ? 'On' : 'Off'}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-seasonal-theme',
                    value:
                      panel.adminState.seasonalTheme === 'off'
                        ? 'spring'
                        : panel.adminState.seasonalTheme === 'spring'
                          ? 'ember'
                          : panel.adminState.seasonalTheme === 'ember'
                            ? 'frost'
                            : 'off',
                  })
                }
              >
                Cycle Seasonal Theme
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-made-by-style',
                    value:
                      panel.adminState.madeByJonsmanStyle === 'default'
                        ? 'gradient'
                        : panel.adminState.madeByJonsmanStyle === 'gradient'
                          ? 'glow'
                          : 'default',
                  })
                }
              >
                Cycle Footer Style
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Notices</p>
                <h2>Homepage Cards And Fun Toggles</h2>
              </div>
            </div>
            <div className="auth-form">
              <label>
                <span>Homepage Notice</span>
                <textarea
                  rows={3}
                  value={noticeText}
                  onChange={(event) => setNoticeText(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'add-notice',
                    value: noticeText,
                    tone: 'neutral',
                  })
                }
              >
                Add Notice
              </button>
            </div>
            <div className="feedback-post-list">
              {panel.adminState.homepageNotices.length > 0 ? (
                panel.adminState.homepageNotices.map((notice) => (
                  <article key={notice.id} className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{notice.text}</strong>
                      <span>{notice.active ? 'Active' : 'Hidden'}</span>
                    </div>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          panel.actions.runVisualAdminAction({
                            type: 'toggle-notice',
                            id: notice.id,
                          })
                        }
                      >
                        Toggle
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runVisualAdminAction({
                            type: 'remove-notice',
                            id: notice.id,
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">No homepage notices yet.</p>
              )}
            </div>
            <div className="settings-grid">
              <label>
                <span>Fake Announcement</span>
                <input
                  value={fakeAnnouncementText}
                  onChange={(event) => setFakeAnnouncementText(event.target.value)}
                />
              </label>
              <label>
                <span>Goofy Event Title</span>
                <input
                  value={goofyEventTitle}
                  onChange={(event) => setGoofyEventTitle(event.target.value)}
                />
              </label>
              <label>
                <span>Fake Global Challenge</span>
                <input
                  value={fakeChallenge}
                  onChange={(event) => setFakeChallenge(event.target.value)}
                />
              </label>
              <label>
                <span>Footer Troll Text</span>
                <input
                  value={footerTrollText}
                  onChange={(event) => setFooterTrollText(event.target.value)}
                />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-fake-announcement',
                    enabled: !panel.adminState.fakeAnnouncementEnabled,
                    value: fakeAnnouncementText,
                  })
                }
              >
                {panel.adminState.fakeAnnouncementEnabled ? 'Disable' : 'Enable'} Fake Banner
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-goofy-event',
                    value: goofyEventTitle,
                  })
                }
              >
                Save Goofy Event
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-fake-challenge',
                    value: fakeChallenge,
                  })
                }
              >
                Save Fake Challenge
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-footer-troll',
                    value: footerTrollText,
                  })
                }
              >
                Save Footer Text
              </button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'toggle-confetti',
                    value: !panel.adminState.confettiEnabled,
                  })
                }
              >
                Confetti: {panel.adminState.confettiEnabled ? 'On' : 'Off'}
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'toggle-jonsman-was-here',
                    value: !panel.adminState.jonsmanWasHereEnabled,
                  })
                }
              >
                Jonsman Was Here: {panel.adminState.jonsmanWasHereEnabled ? 'On' : 'Off'}
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-rainbow-mode',
                    value: selectedMode,
                  })
                }
              >
                Rainbow Selected Mode
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runVisualAdminAction({
                    type: 'set-upside-down-preview',
                    value: selectedMode,
                  })
                }
              >
                Flip Selected Preview
              </button>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'reports' && (
        <div className="admin-section-stack">
          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">All Posts</p>
                  <h2>Reports And Feedback</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.reports.length > 0 ? (
                  panel.reports.map((post) => (
                    <button
                      key={post.id}
                      className={`segment-button ${selectedReport?.id === post.id ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => handleReportLoad(post.id)}
                    >
                      {post.category} / {post.authorName}
                    </button>
                  ))
                ) : (
                  <p className="empty-copy">No bug reports, requests, or reviews yet.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Selected</p>
                  <h2>Moderate Post</h2>
                </div>
              </div>
              {selectedReport ? (
                <>
                  <article className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{selectedReport.authorName}</strong>
                      <span>{formatDate(selectedReport.createdAt)}</span>
                    </div>
                    <p>{selectedReport.body}</p>
                  </article>
                  <div className="settings-grid">
                    <label>
                      <span>Status</span>
                      <select
                        value={reportStatus}
                        onChange={(event) => setReportStatus(event.target.value as FeedbackPost['status'])}
                      >
                        {REPORT_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="menu-actions admin-inline-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        panel.actions.runReportAdminAction({
                          type: 'set-status',
                          postId: selectedReport.id,
                          value: reportStatus,
                        })
                      }
                    >
                      Save Status
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        panel.actions.runReportAdminAction({
                          type: 'pin',
                          postId: selectedReport.id,
                          value: !selectedReport.pinned,
                        })
                      }
                    >
                      {selectedReport.pinned ? 'Unpin Post' : 'Pin Post'}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        confirmDanger('Delete this feedback post?') &&
                        panel.actions.runReportAdminAction({
                          type: 'delete',
                          postId: selectedReport.id,
                        })
                      }
                    >
                      Delete Post
                    </button>
                  </div>
                </>
              ) : (
                <p className="empty-copy">Select a post to moderate it.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {activeSection === 'events' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Announcements</p>
                <h2>Global Event Messaging</h2>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>Announcement Text</span>
                <textarea
                  rows={3}
                  value={announcementText}
                  onChange={(event) => setAnnouncementText(event.target.value)}
                />
              </label>
              <label>
                <span>Expires In Hours</span>
                <input
                  value={announcementHours}
                  onChange={(event) => setAnnouncementHours(event.target.value)}
                />
              </label>
              <label>
                <span>Lobby Message</span>
                <input
                  value={lobbyMessage}
                  onChange={(event) => setLobbyMessage(event.target.value)}
                />
              </label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runEventAdminAction({
                    type: 'add-announcement',
                    value: announcementText,
                    expiresHours: announcementHours,
                  })
                }
              >
                Create Announcement
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runEventAdminAction({
                    type: 'set-lobby-message',
                    value: lobbyMessage,
                  })
                }
              >
                Save Lobby Message
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  panel.actions.runEventAdminAction({
                    type: 'set-featured-mode',
                    value: selectedMode,
                  })
                }
              >
                Feature {PEEK_SELECTION_LABELS[selectedMode]}
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  panel.actions.runEventAdminAction({
                    type: 'set-featured-weapon',
                    value: selectedWeapon,
                  })
                }
              >
                Feature {WEAPON_LABELS[selectedWeapon]}
              </button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runEventAdminAction({
                    type: 'start-bonus-event',
                    value: bonusEventMultiplier,
                  })
                }
              >
                Start Bonus XP Event
              </button>
              <button
                className="ghost-button"
                onClick={() => panel.actions.runEventAdminAction({ type: 'stop-bonus-event' })}
              >
                Stop Bonus Event
              </button>
            </div>
            <div className="feedback-post-list">
              {panel.adminState.temporaryAnnouncements.length > 0 ? (
                panel.adminState.temporaryAnnouncements.map((announcement) => (
                  <article key={announcement.id} className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{announcement.text}</strong>
                      <span>{announcement.active ? 'Active' : 'Hidden'}</span>
                    </div>
                    <div className="menu-actions admin-inline-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          panel.actions.runEventAdminAction({
                            type: 'toggle-announcement',
                            id: announcement.id,
                          })
                        }
                      >
                        Toggle
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          panel.actions.runEventAdminAction({
                            type: 'remove-announcement',
                            id: announcement.id,
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-copy">No temporary announcements configured.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {activeSection === 'moderation' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Filters</p>
                <h2>Spam And Abuse Protection</h2>
              </div>
            </div>
            <div className="auth-form">
              <label>
                <span>Blocked Words</span>
                <textarea
                  rows={6}
                  value={blockedWordsText}
                  onChange={(event) => setBlockedWordsText(event.target.value)}
                />
              </label>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runReportAdminAction({
                      type: 'set-blocked-words',
                      value: blockedWordsText,
                    })
                  }
                >
                  Save Blocked Words
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runReportAdminAction({
                      type: 'toggle-spam-protection',
                      value: !panel.adminState.spamProtectionEnabled,
                    })
                  }
                >
                  Spam Protection: {panel.adminState.spamProtectionEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </section>

          {selectedAccount && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Quick Tools</p>
                  <h2>{selectedAccount.name} Moderation</h2>
                </div>
              </div>
              <div className="menu-actions admin-inline-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    panel.actions.runUserAdminAction({
                      type: 'hide-user',
                      userName: selectedAccount.name,
                      value: !selectedAccount.hiddenFromLeaderboard,
                    })
                  }
                >
                  {selectedAccount.hiddenFromLeaderboard ? 'Show User' : 'Hide User'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runUserAdminAction({
                      type: 'suspend',
                      userName: selectedAccount.name,
                      value: !selectedAccount.suspended,
                    })
                  }
                >
                  {selectedAccount.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    panel.actions.runUserAdminAction({
                      type: 'force-rename',
                      userName: selectedAccount.name,
                    })
                  }
                >
                  Force Rename
                </button>
                <button
                  className="ghost-button"
                  onClick={() =>
                    panel.actions.runUserAdminAction({
                      type: 'set-rate-limit',
                      userName: selectedAccount.name,
                      value: rateLimitMinutes,
                    })
                  }
                >
                  Apply Strict Cooldown
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {activeSection === 'system' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Reset / Save</p>
                <h2>System Control</h2>
              </div>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() => panel.actions.runSystemAdminAction({ type: 'force-save' })}
              >
                Force Save
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  confirmDanger('Reset site settings to defaults?') &&
                  panel.actions.runSystemAdminAction({ type: 'reset-site-settings' })
                }
              >
                Reset Site Settings
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  confirmDanger('Reset the stored admin config?') &&
                  panel.actions.runSystemAdminAction({ type: 'reset-site-config' })
                }
              >
                Reset Admin Config
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  confirmDanger('Clear cached gameplay data?') &&
                  panel.actions.runSystemAdminAction({ type: 'clear-cache' })
                }
              >
                Clear Cached Data
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Import / Export</p>
                <h2>Site Config</h2>
              </div>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button
                className="primary-button"
                onClick={() => window.navigator.clipboard.writeText(panel.exports.siteConfig)}
              >
                Copy Site Config
              </button>
              <button
                className="secondary-button"
                onClick={() => window.navigator.clipboard.writeText(panel.exports.leaderboard)}
              >
                Copy Leaderboard Data
              </button>
              <button
                className="ghost-button"
                onClick={() => window.navigator.clipboard.writeText(panel.exports.settings)}
              >
                Copy Settings
              </button>
            </div>
            <div className="auth-form">
              <label>
                <span>Import Config JSON</span>
                <textarea
                  rows={8}
                  value={importPayload}
                  onChange={(event) => setImportPayload(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() =>
                  panel.actions.runSystemAdminAction({
                    type: 'import-config',
                    value: importPayload,
                  })
                }
              >
                Import Config
              </button>
            </div>
          </section>

          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Storage</p>
                  <h2>Saved Data Overview</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.storageOverview.map((entry) => (
                  <article key={entry.key} className="feedback-post">
                    <div className="feedback-post-meta">
                      <strong>{entry.key}</strong>
                      <span>{formatBytes(entry.bytes)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Audit</p>
                  <h2>Admin Log</h2>
                </div>
              </div>
              <div className="feedback-post-list">
                {panel.adminState.auditLog.length > 0 ? (
                  panel.adminState.auditLog.map((entry) => (
                    <article key={entry.id} className="feedback-post">
                      <div className="feedback-post-meta">
                        <strong>{entry.action}</strong>
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>
                      <p>
                        {entry.actor}: {entry.detail}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="empty-copy">No audit entries yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}
