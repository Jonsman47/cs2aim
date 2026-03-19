import { useMemo, useState } from 'react'
import { PEEK_SELECTION_LABELS, PEEK_SELECTIONS } from '../game/constants.js'
import type {
  AdminState,
  AnonymousProfile,
  AuthAccount,
  FeedbackPost,
  PeekSelection,
} from '../game/types.js'

type AdminSection = 'dashboard' | 'users' | 'modes' | 'reports' | 'system'

export interface AdminPanelModel {
  status: { tone: 'good' | 'warn'; message: string } | null
  adminState: AdminState
  accounts: AuthAccount[]
  anonymousProfile: AnonymousProfile
  reports: FeedbackPost[]
  storageOverview: Array<{ key: string; bytes: number }>
  exports: {
    siteConfig: string
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
    runProgressionAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runModeAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runVisualAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runReportAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    runSystemAdminAction: (action: { type: string; [key: string]: unknown }) => boolean
    clearStatus: () => void
  }
}

interface AdminPanelProps {
  panel: AdminPanelModel
}

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'modes', label: 'Modes' },
  { id: 'reports', label: 'Reports' },
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

export function AdminPanel({ panel }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [search, setSearch] = useState('')
  const filteredUsers = useMemo(
    () =>
      panel.accounts.filter((account) =>
        account.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [panel.accounts, search],
  )
  const [selectedUser, setSelectedUser] = useState(panel.accounts[0]?.name ?? '')
  const selectedAccount =
    panel.accounts.find((account) => account.name === selectedUser) ??
    filteredUsers[0] ??
    panel.accounts[0] ??
    null
  const [renameValue, setRenameValue] = useState(selectedAccount?.name ?? '')
  const [xpDelta, setXpDelta] = useState('500')
  const [userNote, setUserNote] = useState('')
  const [selectedMode, setSelectedMode] = useState<PeekSelection>('cross')
  const [modeDescription, setModeDescription] = useState(
    panel.adminState.modeConfigs.cross.description,
  )
  const [modeHighlightColor, setModeHighlightColor] = useState(
    panel.adminState.modeConfigs.cross.highlightColor,
  )
  const [selectedReportId, setSelectedReportId] = useState(panel.reports[0]?.id ?? '')
  const selectedReport =
    panel.reports.find((report) => report.id === selectedReportId) ?? panel.reports[0] ?? null
  const [reportStatus, setReportStatus] = useState<FeedbackPost['status']>('open')
  const [blockedWordsText, setBlockedWordsText] = useState(
    panel.adminState.blockedWords.join('\n'),
  )
  const [importPayload, setImportPayload] = useState('')

  const selectMode = (peek: PeekSelection) => {
    setSelectedMode(peek)
    setModeDescription(panel.adminState.modeConfigs[peek].description)
    setModeHighlightColor(panel.adminState.modeConfigs[peek].highlightColor)
  }

  return (
    <section className="panel admin-panel-shell">
      <div className="panel-header admin-panel-header">
        <div>
          <p className="eyebrow">Local Admin Controls</p>
          <h2>
            <span className="leaderboard-name-admin">Jonsman</span> Admin Panel
          </h2>
        </div>
        <span className="leaderboard-admin-badge">Admin</span>
      </div>

      <p className="menu-copy">
        This panel now manages only local browser data. Shared profile sync, server saving, and
        leaderboard tools are gone.
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
        {SECTIONS.map((section) => (
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
            <div><span>Total Local Profiles</span><strong>{panel.dashboard.totalPlayers}</strong></div>
            <div><span>Registered Accounts</span><strong>{panel.dashboard.totalRegisteredAccounts}</strong></div>
            <div><span>Anonymous Profiles</span><strong>{panel.dashboard.totalAnonymousPlayers}</strong></div>
            <div><span>Total Shots</span><strong>{panel.dashboard.totalShots.toLocaleString()}</strong></div>
            <div><span>Total Kills</span><strong>{panel.dashboard.totalKills.toLocaleString()}</strong></div>
            <div><span>Total Headshots</span><strong>{panel.dashboard.totalHeadshots.toLocaleString()}</strong></div>
            <div><span>Total Wallbangs</span><strong>{panel.dashboard.totalWallbangs.toLocaleString()}</strong></div>
            <div>
              <span>Avg Reaction</span>
              <strong>{panel.dashboard.averageReactionMs === null ? '--' : `${Math.round(panel.dashboard.averageReactionMs)} ms`}</strong>
            </div>
            <div><span>Most Used Weapon</span><strong>{panel.dashboard.mostUsedWeapon.toUpperCase()}</strong></div>
            <div><span>Most Played Mode</span><strong>{panel.dashboard.mostPlayedMode}</strong></div>
            <div><span>Activity</span><strong>{panel.dashboard.siteActivitySummary}</strong></div>
          </div>
          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Latest</p><h2>Bug Reports</h2></div></div>
              <div className="feedback-post-list">
                {panel.dashboard.latestBugReports.length > 0 ? panel.dashboard.latestBugReports.map((post) => (
                  <article key={post.id} className="feedback-post">
                    <div className="feedback-post-meta"><strong>{post.authorName}</strong><span>{formatDate(post.createdAt)}</span></div>
                    <p>{post.body}</p>
                  </article>
                )) : <p className="empty-copy">No local bug reports yet.</p>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Latest</p><h2>Feature Requests</h2></div></div>
              <div className="feedback-post-list">
                {panel.dashboard.latestFeatureRequests.length > 0 ? panel.dashboard.latestFeatureRequests.map((post) => (
                  <article key={post.id} className="feedback-post">
                    <div className="feedback-post-meta"><strong>{post.authorName}</strong><span>{formatDate(post.createdAt)}</span></div>
                    <p>{post.body}</p>
                  </article>
                )) : <p className="empty-copy">No local feature requests yet.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeSection === 'users' && (
        <div className="admin-section-stack">
          <div className="auth-form">
            <label>
              <span>Search Local Accounts</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>
          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Accounts</p><h2>User Picker</h2></div></div>
              <div className="feedback-post-list">
                {filteredUsers.length > 0 ? filteredUsers.map((account) => (
                  <button
                    key={account.name}
                    className={`segment-button ${selectedUser === account.name ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedUser(account.name)
                      setRenameValue(account.name)
                    }}
                    type="button"
                  >
                    {account.name}
                  </button>
                )) : <p className="empty-copy">No local accounts match.</p>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Selected</p><h2>User Tools</h2></div></div>
              {selectedAccount ? (
                <>
                  <div className="menu-meta admin-metric-grid">
                    <div><span>User</span><strong>{selectedAccount.name}</strong></div>
                    <div><span>XP</span><strong>{selectedAccount.xp.toLocaleString()}</strong></div>
                    <div><span>Kills</span><strong>{selectedAccount.stats.kills.toLocaleString()}</strong></div>
                    <div><span>Shots</span><strong>{selectedAccount.stats.shots.toLocaleString()}</strong></div>
                  </div>
                  <div className="auth-form">
                    <label><span>Rename User</span><input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></label>
                    <div className="menu-actions admin-inline-actions">
                      <button className="primary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'rename', userName: selectedAccount.name, value: renameValue })}>Rename</button>
                      <button className="ghost-button" onClick={() => panel.actions.runUserAdminAction({ type: 'force-rename', userName: selectedAccount.name })}>Force Rename</button>
                    </div>
                    <label><span>XP Delta</span><input value={xpDelta} onChange={(event) => setXpDelta(event.target.value)} /></label>
                    <div className="menu-actions admin-inline-actions">
                      <button className="primary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'add-xp', userName: selectedAccount.name, value: xpDelta })}>Add XP</button>
                      <button className="secondary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'remove-xp', userName: selectedAccount.name, value: xpDelta })}>Remove XP</button>
                      <button className="ghost-button" onClick={() => panel.actions.runUserAdminAction({ type: 'reset-stats', userName: selectedAccount.name })}>Reset Stats</button>
                    </div>
                    <label><span>Admin Note</span><textarea rows={3} value={userNote} onChange={(event) => setUserNote(event.target.value)} /></label>
                    <div className="menu-actions admin-inline-actions">
                      <button className="secondary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'add-note', userName: selectedAccount.name, value: userNote })}>Save Note</button>
                      <button className="secondary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'suspend', userName: selectedAccount.name, value: !selectedAccount.suspended })}>{selectedAccount.suspended ? 'Unsuspend' : 'Suspend'}</button>
                      <button className="secondary-button" onClick={() => panel.actions.runUserAdminAction({ type: 'ban', userName: selectedAccount.name, value: !selectedAccount.banned })}>{selectedAccount.banned ? 'Unban' : 'Ban'}</button>
                      <button className="ghost-button" onClick={() => window.confirm(`Delete ${selectedAccount.name}?`) && panel.actions.runUserAdminAction({ type: 'delete-account', userName: selectedAccount.name })}>Delete Account</button>
                    </div>
                  </div>
                </>
              ) : <p className="empty-copy">Create a local account to manage it here.</p>}
            </section>
          </div>
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Anonymous</p><h2>Guest Profile</h2></div></div>
            <div className="menu-meta admin-metric-grid">
              <div><span>Alias</span><strong>{panel.anonymousProfile.alias ?? `Anonymous ${panel.anonymousProfile.id}`}</strong></div>
              <div><span>XP</span><strong>{panel.anonymousProfile.xp.toLocaleString()}</strong></div>
              <div><span>Kills</span><strong>{panel.anonymousProfile.stats.kills.toLocaleString()}</strong></div>
              <div><span>Shots</span><strong>{panel.anonymousProfile.stats.shots.toLocaleString()}</strong></div>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'modes' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Modes</p><h2>Gameplay Tools</h2></div></div>
            <div className="settings-grid">
              <label>
                <span>Mode</span>
                <select value={selectedMode} onChange={(event) => selectMode(event.target.value as PeekSelection)}>
                  {PEEK_SELECTIONS.map((peek) => <option key={peek} value={peek}>{PEEK_SELECTION_LABELS[peek]}</option>)}
                </select>
              </label>
              <label><span>Description</span><textarea rows={3} value={modeDescription} onChange={(event) => setModeDescription(event.target.value)} /></label>
              <label><span>Highlight Color</span><input value={modeHighlightColor} onChange={(event) => setModeHighlightColor(event.target.value)} /></label>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button className="primary-button" onClick={() => panel.actions.runModeAdminAction({ type: 'update-mode', peek: selectedMode, description: modeDescription, highlightColor: modeHighlightColor })}>Save Mode</button>
              <button className="secondary-button" onClick={() => panel.actions.runModeAdminAction({ type: 'update-mode', peek: selectedMode, popular: !panel.adminState.modeConfigs[selectedMode].popular })}>Popular: {panel.adminState.modeConfigs[selectedMode].popular ? 'On' : 'Off'}</button>
              <button className="ghost-button" onClick={() => panel.actions.runModeAdminAction({ type: 'update-mode', peek: selectedMode, enabled: !panel.adminState.modeConfigs[selectedMode].enabled })}>{panel.adminState.modeConfigs[selectedMode].enabled ? 'Disable' : 'Enable'} Mode</button>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Visuals</p><h2>Local Theme Tools</h2></div></div>
            <div className="menu-actions admin-inline-actions">
              <button className="primary-button" onClick={() => panel.actions.runVisualAdminAction({ type: 'toggle-jonsman-theme', value: !panel.adminState.jonsmanThemeEnabled })}>Jonsman Theme: {panel.adminState.jonsmanThemeEnabled ? 'On' : 'Off'}</button>
              <button className="secondary-button" onClick={() => panel.actions.runVisualAdminAction({ type: 'toggle-special-highlights', value: !panel.adminState.specialUiHighlights })}>Highlights: {panel.adminState.specialUiHighlights ? 'On' : 'Off'}</button>
              <button className="ghost-button" onClick={() => panel.actions.runVisualAdminAction({ type: 'toggle-confetti', value: !panel.adminState.confettiEnabled })}>Confetti: {panel.adminState.confettiEnabled ? 'On' : 'Off'}</button>
            </div>
          </section>
        </div>
      )}

      {activeSection === 'reports' && (
        <div className="admin-section-stack">
          <div className="feedback-grid">
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Posts</p><h2>Feedback Queue</h2></div></div>
              <div className="feedback-post-list">
                {panel.reports.length > 0 ? panel.reports.map((post) => (
                  <button
                    key={post.id}
                    className={`segment-button ${selectedReport?.id === post.id ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => {
                      setSelectedReportId(post.id)
                      setReportStatus(post.status)
                    }}
                  >
                    {post.category} / {post.authorName}
                  </button>
                )) : <p className="empty-copy">No local reports or feedback yet.</p>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-header"><div><p className="eyebrow">Moderation</p><h2>Selected Post</h2></div></div>
              {selectedReport ? (
                <>
                  <article className="feedback-post">
                    <div className="feedback-post-meta"><strong>{selectedReport.authorName}</strong><span>{formatDate(selectedReport.createdAt)}</span></div>
                    <p>{selectedReport.body}</p>
                  </article>
                  <div className="settings-grid">
                    <label>
                      <span>Status</span>
                      <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value as FeedbackPost['status'])}>
                        {REPORT_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="menu-actions admin-inline-actions">
                    <button className="primary-button" onClick={() => panel.actions.runReportAdminAction({ type: 'set-status', postId: selectedReport.id, value: reportStatus })}>Save Status</button>
                    <button className="secondary-button" onClick={() => panel.actions.runReportAdminAction({ type: 'pin', postId: selectedReport.id, value: !selectedReport.pinned })}>{selectedReport.pinned ? 'Unpin' : 'Pin'}</button>
                    <button className="ghost-button" onClick={() => window.confirm('Delete this post?') && panel.actions.runReportAdminAction({ type: 'delete', postId: selectedReport.id })}>Delete</button>
                  </div>
                </>
              ) : <p className="empty-copy">Select a local post to moderate it.</p>}
            </section>
          </div>
        </div>
      )}

      {activeSection === 'system' && (
        <div className="admin-section-stack">
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Moderation</p><h2>Blocked Words</h2></div></div>
            <div className="auth-form">
              <label><span>Blocked Words</span><textarea rows={6} value={blockedWordsText} onChange={(event) => setBlockedWordsText(event.target.value)} /></label>
              <div className="menu-actions admin-inline-actions">
                <button className="primary-button" onClick={() => panel.actions.runReportAdminAction({ type: 'set-blocked-words', value: blockedWordsText })}>Save Blocked Words</button>
                <button className="secondary-button" onClick={() => panel.actions.runReportAdminAction({ type: 'toggle-spam-protection', value: !panel.adminState.spamProtectionEnabled })}>Spam Protection: {panel.adminState.spamProtectionEnabled ? 'On' : 'Off'}</button>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header"><div><p className="eyebrow">Local Storage</p><h2>System Control</h2></div></div>
            <div className="menu-actions admin-inline-actions">
              <button className="primary-button" onClick={() => panel.actions.runSystemAdminAction({ type: 'force-save' })}>Force Save</button>
              <button className="secondary-button" onClick={() => window.confirm('Reset local site settings?') && panel.actions.runSystemAdminAction({ type: 'reset-site-settings' })}>Reset Settings</button>
              <button className="secondary-button" onClick={() => window.confirm('Reset admin config?') && panel.actions.runSystemAdminAction({ type: 'reset-site-config' })}>Reset Admin Config</button>
              <button className="ghost-button" onClick={() => window.confirm('Clear cached gameplay data?') && panel.actions.runSystemAdminAction({ type: 'clear-cache' })}>Clear Cached Data</button>
            </div>
            <div className="menu-actions admin-inline-actions">
              <button className="primary-button" onClick={() => window.navigator.clipboard.writeText(panel.exports.siteConfig)}>Copy Site Config</button>
              <button className="ghost-button" onClick={() => window.navigator.clipboard.writeText(panel.exports.settings)}>Copy Settings</button>
            </div>
            <div className="auth-form">
              <label><span>Import Config JSON</span><textarea rows={8} value={importPayload} onChange={(event) => setImportPayload(event.target.value)} /></label>
              <button className="primary-button" onClick={() => panel.actions.runSystemAdminAction({ type: 'import-config', value: importPayload })}>Import Config</button>
            </div>
            <div className="feedback-post-list">
              {panel.storageOverview.map((entry) => (
                <article key={entry.key} className="feedback-post">
                  <div className="feedback-post-meta"><strong>{entry.key}</strong><span>{entry.bytes} bytes</span></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
