import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import type { PoolClient } from 'pg'
import { pool } from './db.ts'
import { buildLeaderboardSnapshots } from './leaderboards.ts'
import {
  ADMIN_USERNAME,
  createDefaultAdminState,
  normalizeAdminState,
  setAdminRuntimeState,
} from '../src/game/admin.ts'
import {
  createEmptyAccountStats,
  createEmptyAccountSubmissionCooldowns,
  createEmptyAnonymousProfile,
  hasMeaningfulProgress,
} from '../src/game/auth.ts'
import type {
  AccountStats,
  AdminState,
  AnonymousProfile,
  AuthAccount,
  AuthState,
  FeedbackCategory,
  FeedbackPost,
  FeedbackState,
} from '../src/game/types.ts'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
const FEEDBACK_COOLDOWN_MS = 60 * 60 * 1000
const MAX_FEEDBACK_POSTS = 36
const MAX_FEEDBACK_BODY_LENGTH = 420

const sanitizeName = (value: string) => value.trim()
const createId = (prefix: string) => `${prefix}-${randomUUID()}`
const createSessionToken = () => randomBytes(32).toString('hex')
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')
const normalizeNow = () => Date.now()

const normalizeStats = (stats: Partial<AccountStats> | undefined): AccountStats => ({
  ...createEmptyAccountStats(),
  ...stats,
  shots: Number(stats?.shots) || 0,
  kills: Number(stats?.kills) || 0,
  headshots: Number(stats?.headshots) || 0,
  wallbangs: Number(stats?.wallbangs) || 0,
  cumulativeReactionMs: Number(stats?.cumulativeReactionMs) || 0,
  qualifyingReactionMs: Number(stats?.qualifyingReactionMs) || 0,
  qualifyingReactionCount: Number(stats?.qualifyingReactionCount) || 0,
  fastestReactionMs:
    typeof stats?.fastestReactionMs === 'number' ? stats.fastestReactionMs : null,
  bestScore: Number(stats?.bestScore) || 0,
})

const normalizeCooldowns = (
  cooldowns:
    | {
        bugReportAt?: unknown
        featureRequestAt?: unknown
      }
    | undefined,
) => ({
  ...createEmptyAccountSubmissionCooldowns(),
  bugReportAt:
    typeof cooldowns?.bugReportAt === 'number' ? cooldowns.bugReportAt : null,
  featureRequestAt:
    typeof cooldowns?.featureRequestAt === 'number'
      ? cooldowns.featureRequestAt
      : null,
})

const normalizeStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      )
    : []

const serializeStats = (stats: AccountStats) => normalizeStats(stats)
const serializeCooldowns = (cooldowns: AuthAccount['cooldowns']) =>
  normalizeCooldowns(cooldowns)

const normalizeAnonymousProfileInput = (
  profile: AnonymousProfile | null | undefined,
) => {
  const fallback = createEmptyAnonymousProfile()

  if (!profile) {
    return fallback
  }

  return {
    profileId: profile.profileId ?? fallback.profileId,
    id: /^\d{3}$/.test(profile.id) ? profile.id : fallback.id,
    xp: Math.max(0, Math.round(Number(profile.xp) || 0)),
    stats: normalizeStats(profile.stats),
    alias:
      typeof profile.alias === 'string' && profile.alias.trim()
        ? profile.alias.trim()
        : null,
    hiddenFromLeaderboard: Boolean(profile.hiddenFromLeaderboard),
    adminNotes: normalizeStringList(profile.adminNotes),
  }
}

const mergeStats = (base: AccountStats, bonus: AccountStats): AccountStats => ({
  shots: base.shots + bonus.shots,
  kills: base.kills + bonus.kills,
  headshots: base.headshots + bonus.headshots,
  wallbangs: base.wallbangs + bonus.wallbangs,
  cumulativeReactionMs: base.cumulativeReactionMs + bonus.cumulativeReactionMs,
  qualifyingReactionMs: base.qualifyingReactionMs + bonus.qualifyingReactionMs,
  qualifyingReactionCount: base.qualifyingReactionCount + bonus.qualifyingReactionCount,
  fastestReactionMs:
    base.fastestReactionMs === null
      ? bonus.fastestReactionMs
      : bonus.fastestReactionMs === null
        ? base.fastestReactionMs
        : Math.min(base.fastestReactionMs, bonus.fastestReactionMs),
  bestScore: Math.max(base.bestScore, bonus.bestScore),
})

const mergeProfiles = (
  base: { xp: number; stats: AccountStats },
  bonus: { xp: number; stats: AccountStats },
) => ({
  xp: Math.max(0, base.xp) + Math.max(0, bonus.xp),
  stats: mergeStats(base.stats, bonus.stats),
})

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

const verifyPassword = (password: string, storedHash: string) => {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    return false
  }

  const incoming = scryptSync(password, salt, 64)
  const existing = Buffer.from(hash, 'hex')
  if (incoming.length !== existing.length) {
    return false
  }

  return timingSafeEqual(incoming, existing)
}

const normalizeFeedbackState = (posts: FeedbackPost[]): FeedbackState => ({
  posts: posts.slice(0, MAX_FEEDBACK_POSTS),
})

const sanitizeFeedbackBody = (value: string) =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_FEEDBACK_BODY_LENGTH)

const buildClientAccount = (row: {
  id: string
  username: string
  xp: number
  stats: unknown
  cooldowns: unknown
  badges: unknown
  featured: boolean
  suspended: boolean
  banned: boolean
  hidden_from_leaderboard: boolean
  strict_feedback_cooldown_minutes: number | null
  name_color: string | null
  admin_notes: unknown
}): AuthAccount => ({
  id: row.id,
  name: row.username,
  password: '',
  xp: Number(row.xp) || 0,
  stats: normalizeStats(row.stats as Partial<AccountStats>),
  cooldowns: normalizeCooldowns(row.cooldowns as AuthAccount['cooldowns']),
  badges: normalizeStringList(row.badges),
  featured: Boolean(row.featured),
  suspended: Boolean(row.suspended),
  banned: Boolean(row.banned),
  hiddenFromLeaderboard: Boolean(row.hidden_from_leaderboard),
  strictFeedbackCooldownMinutes:
    typeof row.strict_feedback_cooldown_minutes === 'number'
      ? row.strict_feedback_cooldown_minutes
      : null,
  nameColor: row.name_color,
  adminNotes: normalizeStringList(row.admin_notes),
})

const buildClientAnonymousProfile = (row: {
  profile_id: string
  display_id: string
  xp: number
  stats: unknown
  alias: string | null
  hidden_from_leaderboard: boolean
  admin_notes: unknown
}): AnonymousProfile => ({
  profileId: row.profile_id,
  id: row.display_id,
  xp: Number(row.xp) || 0,
  stats: normalizeStats(row.stats as Partial<AccountStats>),
  alias: row.alias,
  hiddenFromLeaderboard: Boolean(row.hidden_from_leaderboard),
  adminNotes: normalizeStringList(row.admin_notes),
})

const createEmptyServerAnonymousProfile = (): AnonymousProfile => {
  const empty = createEmptyAnonymousProfile()
  return {
    ...empty,
    profileId: empty.profileId,
  }
}

const sanitizeAdminStateForClient = (state: AdminState, isAdmin: boolean) => {
  if (isAdmin) {
    return state
  }

  return {
    ...state,
    blockedWords: [],
    auditLog: [],
  }
}

const createFeedbackPost = ({
  category,
  body,
  authorName,
  accountName,
}: {
  category: FeedbackCategory
  body: string
  authorName: string
  accountName: string | null
}): FeedbackPost => ({
  id: `${category}-${Date.now()}-${randomBytes(4).toString('hex')}`,
  category,
  body,
  createdAt: normalizeNow(),
  authorName,
  accountName,
  status: 'open',
  pinned: false,
})

const parseFeedbackRow = (row: {
  id: string
  category: FeedbackCategory
  body: string
  created_at: number
  author_name: string
  account_name: string | null
  status: FeedbackPost['status']
  pinned: boolean
}): FeedbackPost => ({
  id: row.id,
  category: row.category,
  body: row.body,
  createdAt: Number(row.created_at) || 0,
  authorName: row.author_name,
  accountName: row.account_name,
  status: row.status,
  pinned: Boolean(row.pinned),
})

const getCooldownRemainingMs = (
  lastSubmittedAt: number | null,
  now: number,
  cooldownMs: number,
) => {
  if (lastSubmittedAt === null) {
    return 0
  }

  return Math.max(cooldownMs - (now - lastSubmittedAt), 0)
}

const generateAnonymousDisplayId = async (client: PoolClient) => {
  for (let attempt = 0; attempt < 1500; attempt += 1) {
    const displayId = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    const existing = await client.query(
      'SELECT 1 FROM anonymous_profiles WHERE display_id = $1 LIMIT 1',
      [displayId],
    )
    if (existing.rowCount === 0) {
      return displayId
    }
  }

  return Math.floor(Date.now() % 1000)
    .toString()
    .padStart(3, '0')
}

const createAnonymousProfileRow = async (client: PoolClient) => {
  const empty = createEmptyAnonymousProfile()
  const profileId = createId('anon')
  const displayId = await generateAnonymousDisplayId(client)
  await client.query(
    `INSERT INTO anonymous_profiles (
      profile_id,
      display_id,
      xp,
      stats,
      alias,
      hidden_from_leaderboard,
      admin_notes
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb)`,
    [
      profileId,
      displayId,
      0,
      JSON.stringify(serializeStats(empty.stats)),
      null,
      false,
      JSON.stringify([]),
    ],
  )

  return {
    profileId,
    id: displayId,
    xp: 0,
    stats: empty.stats,
    alias: null,
    hiddenFromLeaderboard: false,
    adminNotes: [],
  } satisfies AnonymousProfile
}

const getAdminState = async (client: PoolClient) => {
  const result = await client.query<{
    state_json: Partial<AdminState>
  }>('SELECT state_json FROM admin_site_state WHERE singleton = TRUE LIMIT 1')
  const state = normalizeAdminState(result.rows[0]?.state_json ?? createDefaultAdminState())
  setAdminRuntimeState(state)
  return state
}

const saveAdminState = async (client: PoolClient, adminState: AdminState) => {
  const normalized = normalizeAdminState(adminState)
  await client.query(
    `INSERT INTO admin_site_state (singleton, state_json, updated_at)
     VALUES (TRUE, $1::jsonb, now())
     ON CONFLICT (singleton)
     DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = now()`,
    [JSON.stringify(normalized)],
  )
  setAdminRuntimeState(normalized)
  return normalized
}

const getFeedbackState = async (client: PoolClient) => {
  const result = await client.query<{
    id: string
    category: FeedbackCategory
    body: string
    created_at: number
    author_name: string
    account_name: string | null
    status: FeedbackPost['status']
    pinned: boolean
  }>(
    `SELECT id, category, body, created_at, author_name, account_name, status, pinned
     FROM feedback_posts
     ORDER BY pinned DESC, created_at DESC
     LIMIT $1`,
    [MAX_FEEDBACK_POSTS],
  )

  return normalizeFeedbackState(result.rows.map(parseFeedbackRow))
}

const replaceFeedbackState = async (
  client: PoolClient,
  feedbackState: FeedbackState,
) => {
  await client.query('DELETE FROM feedback_posts')
  for (const post of feedbackState.posts.slice(0, MAX_FEEDBACK_POSTS)) {
    await client.query(
      `INSERT INTO feedback_posts (
        id,
        category,
        body,
        created_at,
        author_name,
        account_name,
        status,
        pinned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        post.id,
        post.category,
        post.body,
        post.createdAt,
        post.authorName,
        post.accountName,
        post.status,
        post.pinned,
      ],
    )
  }

  return normalizeFeedbackState(feedbackState.posts)
}

const getAccountByName = async (client: PoolClient, name: string) => {
  const result = await client.query<{
    id: string
    username: string
    password_hash: string
    xp: number
    stats: unknown
    cooldowns: unknown
    badges: unknown
    featured: boolean
    suspended: boolean
    banned: boolean
    hidden_from_leaderboard: boolean
    strict_feedback_cooldown_minutes: number | null
    name_color: string | null
    admin_notes: unknown
  }>(
    `SELECT *
     FROM accounts
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [sanitizeName(name)],
  )

  return result.rows[0] ?? null
}

const getAccountById = async (client: PoolClient, id: string | null) => {
  if (!id) {
    return null
  }

  const result = await client.query<{
    id: string
    username: string
    xp: number
    stats: unknown
    cooldowns: unknown
    badges: unknown
    featured: boolean
    suspended: boolean
    banned: boolean
    hidden_from_leaderboard: boolean
    strict_feedback_cooldown_minutes: number | null
    name_color: string | null
    admin_notes: unknown
  }>(
    `SELECT
       id,
       username,
       xp,
       stats,
       cooldowns,
       badges,
       featured,
       suspended,
       banned,
       hidden_from_leaderboard,
       strict_feedback_cooldown_minutes,
       name_color,
       admin_notes
     FROM accounts
     WHERE id = $1
     LIMIT 1`,
    [id],
  )

  return result.rows[0] ? buildClientAccount(result.rows[0]) : null
}

const getAllAccounts = async (client: PoolClient) => {
  const result = await client.query<{
    id: string
    username: string
    xp: number
    stats: unknown
    cooldowns: unknown
    badges: unknown
    featured: boolean
    suspended: boolean
    banned: boolean
    hidden_from_leaderboard: boolean
    strict_feedback_cooldown_minutes: number | null
    name_color: string | null
    admin_notes: unknown
  }>(
    `SELECT
       id,
       username,
       xp,
       stats,
       cooldowns,
       badges,
       featured,
       suspended,
       banned,
       hidden_from_leaderboard,
       strict_feedback_cooldown_minutes,
       name_color,
       admin_notes
     FROM accounts
     ORDER BY LOWER(username) ASC`,
  )

  return result.rows.map(buildClientAccount)
}

const getAnonymousProfileById = async (
  client: PoolClient,
  profileId: string | null,
) => {
  if (!profileId) {
    return null
  }

  const result = await client.query<{
    profile_id: string
    display_id: string
    xp: number
    stats: unknown
    alias: string | null
    hidden_from_leaderboard: boolean
    admin_notes: unknown
  }>(
    `SELECT
       profile_id,
       display_id,
       xp,
       stats,
       alias,
       hidden_from_leaderboard,
       admin_notes
     FROM anonymous_profiles
     WHERE profile_id = $1
     LIMIT 1`,
    [profileId],
  )

  return result.rows[0] ? buildClientAnonymousProfile(result.rows[0]) : null
}

const getAllAnonymousProfiles = async (client: PoolClient) => {
  const result = await client.query<{
    profile_id: string
    display_id: string
    xp: number
    stats: unknown
    alias: string | null
    hidden_from_leaderboard: boolean
    admin_notes: unknown
  }>(
    `SELECT
       profile_id,
       display_id,
       xp,
       stats,
       alias,
       hidden_from_leaderboard,
       admin_notes
     FROM anonymous_profiles
     WHERE transferred_to_account_id IS NULL
     ORDER BY created_at ASC`,
  )

  return result.rows.map(buildClientAnonymousProfile)
}

interface SessionRow {
  id: string
  account_id: string | null
  anonymous_profile_id: string | null
}

const getSessionByToken = async (client: PoolClient, token: string | null) => {
  if (!token) {
    return null
  }

  await client.query('DELETE FROM sessions WHERE expires_at <= now()')
  const result = await client.query<SessionRow>(
    `SELECT id, account_id, anonymous_profile_id
     FROM sessions
     WHERE token_hash = $1
       AND expires_at > now()
     LIMIT 1`,
    [hashToken(token)],
  )

  return result.rows[0] ?? null
}

const touchSession = async (client: PoolClient, sessionId: string) => {
  await client.query(
    `UPDATE sessions
     SET last_seen_at = now(),
         updated_at = now(),
         expires_at = now() + ($2 || ' milliseconds')::interval
     WHERE id = $1`,
    [sessionId, `${SESSION_TTL_MS}`],
  )
}

const ensureAnonymousProfile = async (
  client: PoolClient,
  session: SessionRow,
): Promise<AnonymousProfile> => {
  let anonymousProfile = await getAnonymousProfileById(client, session.anonymous_profile_id)
  if (anonymousProfile) {
    return anonymousProfile
  }

  anonymousProfile = await createAnonymousProfileRow(client)
  await client.query(
    `UPDATE sessions
     SET anonymous_profile_id = $2,
         updated_at = now()
     WHERE id = $1`,
    [session.id, anonymousProfile.profileId],
  )
  return anonymousProfile
}

const createSession = async (client: PoolClient) => {
  const anonymousProfile = await createAnonymousProfileRow(client)
  const token = createSessionToken()
  const sessionId = createId('session')
  await client.query(
    `INSERT INTO sessions (
      id,
      token_hash,
      account_id,
      anonymous_profile_id,
      expires_at
    ) VALUES (
      $1,
      $2,
      NULL,
      $3,
      now() + ($4 || ' milliseconds')::interval
    )`,
    [sessionId, hashToken(token), anonymousProfile.profileId, `${SESSION_TTL_MS}`],
  )

  return {
    token,
    session: {
      id: sessionId,
      account_id: null,
      anonymous_profile_id: anonymousProfile.profileId,
    } satisfies SessionRow,
  }
}

const buildAuthStateForSession = async (
  client: PoolClient,
  session: SessionRow,
): Promise<AuthState> => {
  const activeAccount = await getAccountById(client, session.account_id)
  const isAdmin = activeAccount?.name === ADMIN_USERNAME
  const accounts = isAdmin
    ? await getAllAccounts(client)
    : activeAccount
      ? [activeAccount]
      : []
  const anonymousProfile =
    (await getAnonymousProfileById(client, session.anonymous_profile_id)) ??
    createEmptyServerAnonymousProfile()

  return {
    accounts,
    activeUserName: activeAccount?.name ?? null,
    anonymousProfile,
  }
}

const ensureSessionState = async (
  client: PoolClient,
  sessionToken: string | null,
  request:
    | {
        legacyAnonymousProfile?: AnonymousProfile | null
      }
    | undefined,
) => {
  let token = sessionToken
  let session = await getSessionByToken(client, token)
  let authMessage: string | null = null

  if (!session) {
    const created = await createSession(client)
    token = created.token
    session = created.session
  }

  if (!token) {
    throw new Error('Session token could not be established.')
  }

  const anonymousProfile = await ensureAnonymousProfile(client, session)
  const legacyProfile = normalizeAnonymousProfileInput(request?.legacyAnonymousProfile)
  const shouldApplyLegacyAnonymous =
    !hasMeaningfulProgress({ xp: anonymousProfile.xp, stats: anonymousProfile.stats }) &&
    hasMeaningfulProgress({ xp: legacyProfile.xp, stats: legacyProfile.stats })

  if (shouldApplyLegacyAnonymous && anonymousProfile.profileId) {
    await client.query(
      `UPDATE anonymous_profiles
       SET xp = $2,
           stats = $3::jsonb,
           alias = $4,
           hidden_from_leaderboard = $5,
           admin_notes = $6::jsonb,
           updated_at = now()
       WHERE profile_id = $1`,
      [
        anonymousProfile.profileId,
        legacyProfile.xp,
        JSON.stringify(serializeStats(legacyProfile.stats)),
        legacyProfile.alias,
        legacyProfile.hiddenFromLeaderboard,
        JSON.stringify(legacyProfile.adminNotes),
      ],
    )
    authMessage =
      'Recovered your previous local anonymous progression and moved it into the shared server profile.'
  }

  await touchSession(client, session.id)
  const authState = await buildAuthStateForSession(client, session)

  return {
    token,
    session,
    authState,
    authMessage,
  }
}

const currentActorName = (authState: AuthState) =>
  authState.activeUserName ??
  authState.anonymousProfile.alias?.trim() ??
  `Anonymous ${authState.anonymousProfile.id}`

const requireAdmin = (authState: AuthState) => authState.activeUserName === ADMIN_USERNAME

export const bootstrapSession = async (
  sessionToken: string | null,
  request?: {
    legacyAnonymousProfile?: AnonymousProfile | null
  },
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, request)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      authState: ensured.authState,
      authMessage: ensured.authMessage,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const fetchLeaderboards = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const adminState = await getAdminState(client)
    const accounts = await getAllAccounts(client)
    const anonymousProfiles = await getAllAnonymousProfiles(client)
    await client.query('COMMIT')
    return buildLeaderboardSnapshots({
      accounts,
      anonymousProfiles,
      adminState,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const fetchCommunitySnapshot = async (sessionToken: string | null) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    const adminState = await getAdminState(client)
    const feedbackState = await getFeedbackState(client)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      adminState: sanitizeAdminStateForClient(
        adminState,
        requireAdmin(ensured.authState),
      ),
      feedbackState,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const validateProgressionPayload = (payload: {
  eventId: string
  xpDelta: number
  shotsDelta: number
  killsDelta: number
  headshotsDelta: number
  wallbangsDelta: number
  reactionTimes: number[]
  score: number | null
}) => {
  const xpDelta = Math.max(0, Math.round(Number(payload.xpDelta) || 0))
  const shotsDelta = Math.max(0, Math.round(Number(payload.shotsDelta) || 0))
  const killsDelta = Math.max(0, Math.round(Number(payload.killsDelta) || 0))
  const headshotsDelta = Math.max(0, Math.round(Number(payload.headshotsDelta) || 0))
  const wallbangsDelta = Math.max(0, Math.round(Number(payload.wallbangsDelta) || 0))
  const reactionTimes = payload.reactionTimes
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 5000,
    )
    .slice(0, 24)
  const score =
    typeof payload.score === 'number' && Number.isFinite(payload.score)
      ? Math.max(0, Math.min(100, Math.round(payload.score)))
      : null

  if (
    !payload.eventId.trim() ||
    xpDelta > 10000 ||
    shotsDelta > 1500 ||
    killsDelta > shotsDelta ||
    headshotsDelta > killsDelta ||
    wallbangsDelta > killsDelta ||
    reactionTimes.length > Math.max(killsDelta, 1)
  ) {
    return null
  }

  return {
    eventId: payload.eventId.trim(),
    xpDelta,
    shotsDelta,
    killsDelta,
    headshotsDelta,
    wallbangsDelta,
    reactionTimes,
    score,
  }
}

export const registerWithServer = async (
  sessionToken: string | null,
  request: {
    name: string
    password: string
    legacyAccount?: AuthAccount | null
  },
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    const name = sanitizeName(request.name)
    const password = request.password.trim()
    const legacyAccount = request.legacyAccount

    if (ensured.authState.activeUserName) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'Log out before registering a different account.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    if (!name || !password) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'Name and password are required.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    const existingAccount = await getAccountByName(client, name)
    if (existingAccount) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'That name is already registered.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    const currentAnonymousProfile = ensured.authState.anonymousProfile
    const validatedLegacyAccount =
      legacyAccount &&
      sanitizeName(legacyAccount.name).toLowerCase() === name.toLowerCase() &&
      legacyAccount.password.trim() === password
        ? legacyAccount
        : null
    const importedProfile = validatedLegacyAccount
      ? mergeProfiles(
          {
            xp: currentAnonymousProfile.xp,
            stats: currentAnonymousProfile.stats,
          },
          {
            xp: Math.max(0, validatedLegacyAccount.xp),
            stats: normalizeStats(validatedLegacyAccount.stats),
          },
        )
      : {
          xp: currentAnonymousProfile.xp,
          stats: currentAnonymousProfile.stats,
        }
    const nextAccountId = createId('acct')

    await client.query(
      `INSERT INTO accounts (
        id,
        username,
        password_hash,
        xp,
        stats,
        cooldowns,
        badges,
        featured,
        suspended,
        banned,
        hidden_from_leaderboard,
        strict_feedback_cooldown_minutes,
        name_color,
        admin_notes
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6::jsonb,
        $7::jsonb,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14::jsonb
      )`,
      [
        nextAccountId,
        name,
        hashPassword(password),
        importedProfile.xp,
        JSON.stringify(serializeStats(importedProfile.stats)),
        JSON.stringify(
          validatedLegacyAccount
            ? normalizeCooldowns(validatedLegacyAccount.cooldowns)
            : createEmptyAccountSubmissionCooldowns(),
        ),
        JSON.stringify(
          validatedLegacyAccount ? normalizeStringList(validatedLegacyAccount.badges) : [],
        ),
        Boolean(validatedLegacyAccount?.featured),
        false,
        false,
        Boolean(validatedLegacyAccount?.hiddenFromLeaderboard),
        validatedLegacyAccount?.strictFeedbackCooldownMinutes ?? null,
        validatedLegacyAccount?.nameColor ?? null,
        JSON.stringify(
          validatedLegacyAccount ? normalizeStringList(validatedLegacyAccount.adminNotes) : [],
        ),
      ],
    )

    let nextAnonymousProfileId = ensured.session.anonymous_profile_id
    const transferredAnonymous =
      hasMeaningfulProgress({
        xp: currentAnonymousProfile.xp,
        stats: currentAnonymousProfile.stats,
      }) || validatedLegacyAccount !== null

    if (transferredAnonymous && currentAnonymousProfile.profileId) {
      await client.query(
        `UPDATE anonymous_profiles
         SET transferred_to_account_id = $2,
             updated_at = now()
         WHERE profile_id = $1`,
        [currentAnonymousProfile.profileId, nextAccountId],
      )
      const freshAnonymous = await createAnonymousProfileRow(client)
      nextAnonymousProfileId = freshAnonymous.profileId
    }

    await client.query(
      `UPDATE sessions
       SET account_id = $2,
           anonymous_profile_id = $3,
           updated_at = now()
       WHERE id = $1`,
      [ensured.session.id, nextAccountId, nextAnonymousProfileId],
    )

    const authState = await buildAuthStateForSession(client, {
      ...ensured.session,
      account_id: nextAccountId,
      anonymous_profile_id: nextAnonymousProfileId,
    })
    await client.query('COMMIT')
    return {
      ok: true,
      message: transferredAnonymous
        ? `Logged in as ${name}. Existing anonymous progression was moved into the shared account.`
        : `Logged in as ${name}. New shared account ready.`,
      authState,
      sessionToken: ensured.token,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const loginWithServer = async (
  sessionToken: string | null,
  request: {
    name: string
    password: string
    legacyAccount?: AuthAccount | null
  },
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    const name = sanitizeName(request.name)
    const password = request.password.trim()

    if (!name || !password) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'Name and password are required.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    let accountRow = await getAccountByName(client, name)
    const legacyAccount = request.legacyAccount
    const canImportLegacyAccount =
      !accountRow &&
      legacyAccount &&
      sanitizeName(legacyAccount.name).toLowerCase() === name.toLowerCase() &&
      legacyAccount.password.trim() === password

    if (!accountRow && canImportLegacyAccount) {
      await client.query(
        `INSERT INTO accounts (
          id,
          username,
          password_hash,
          xp,
          stats,
          cooldowns,
          badges,
          featured,
          suspended,
          banned,
          hidden_from_leaderboard,
          strict_feedback_cooldown_minutes,
          name_color,
          admin_notes
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7::jsonb,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb
        )`,
        [
          createId('acct'),
          name,
          hashPassword(password),
          Math.max(0, legacyAccount.xp),
          JSON.stringify(serializeStats(normalizeStats(legacyAccount.stats))),
          JSON.stringify(normalizeCooldowns(legacyAccount.cooldowns)),
          JSON.stringify(normalizeStringList(legacyAccount.badges)),
          Boolean(legacyAccount.featured),
          false,
          false,
          Boolean(legacyAccount.hiddenFromLeaderboard),
          legacyAccount.strictFeedbackCooldownMinutes ?? null,
          legacyAccount.nameColor ?? null,
          JSON.stringify(normalizeStringList(legacyAccount.adminNotes)),
        ],
      )
      accountRow = await getAccountByName(client, name)
    }

    if (!accountRow) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'Account not found.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    if (!verifyPassword(password, accountRow.password_hash)) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'Wrong password.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    const account = buildClientAccount(accountRow)
    if (account.banned) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'That account is banned.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    if (account.suspended) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'That account is suspended right now.',
        authState: ensured.authState,
        sessionToken: ensured.token,
      }
    }

    await client.query(
      `UPDATE sessions
       SET account_id = $2,
           updated_at = now()
       WHERE id = $1`,
      [ensured.session.id, account.id],
    )

    const authState = await buildAuthStateForSession(client, {
      ...ensured.session,
      account_id: account.id,
    })
    await client.query('COMMIT')
    return {
      ok: true,
      message:
        canImportLegacyAccount && request.legacyAccount
          ? `Imported your local account into the shared server and logged in as ${account.name}.`
          : `Logged in as ${account.name}. Using shared server progression.`,
      authState,
      sessionToken: ensured.token,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const logoutFromServer = async (sessionToken: string | null) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    await client.query(
      `UPDATE sessions
       SET account_id = NULL,
           updated_at = now()
       WHERE id = $1`,
      [ensured.session.id],
    )
    const authState = await buildAuthStateForSession(client, {
      ...ensured.session,
      account_id: null,
    })
    await client.query('COMMIT')
    return {
      authState,
      message:
        'Logged out. Your shared anonymous profile is active on this device until you log in again.',
      sessionToken: ensured.token,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const syncProgressionEvent = async (
  sessionToken: string | null,
  payload: {
    eventId: string
    xpDelta: number
    shotsDelta: number
    killsDelta: number
    headshotsDelta: number
    wallbangsDelta: number
    reactionTimes: number[]
    score: number | null
  },
) => {
  const validated = validateProgressionPayload(payload)
  if (!validated) {
    throw new Error('Invalid progression payload.')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    const actorType = ensured.authState.activeUserName ? 'account' : 'anonymous'
    const actorId = ensured.authState.activeUserName
      ? ensured.authState.accounts.find(
          (account) => account.name === ensured.authState.activeUserName,
        )?.id
      : ensured.authState.anonymousProfile.profileId

    if (!actorId) {
      throw new Error('No active progression actor found.')
    }

    const duplicate = await client.query(
      'SELECT 1 FROM progression_events WHERE id = $1 LIMIT 1',
      [validated.eventId],
    )

    if (duplicate.rowCount === 0) {
      const cumulativeReactionDelta = validated.reactionTimes.reduce(
        (total, reactionTime) => total + reactionTime,
        0,
      )
      const qualifyingReactionTimes = validated.reactionTimes.filter(
        (reactionTime) => reactionTime < 1000,
      )
      const qualifyingReactionDelta = qualifyingReactionTimes.reduce(
        (total, reactionTime) => total + reactionTime,
        0,
      )
      const qualifyingReactionCountDelta = qualifyingReactionTimes.length
      const fastestReactionCandidate =
        validated.reactionTimes.length > 0 ? Math.min(...validated.reactionTimes) : null
      const tableName = actorType === 'account' ? 'accounts' : 'anonymous_profiles'
      const idColumn = actorType === 'account' ? 'id' : 'profile_id'

      await client.query(
        `INSERT INTO progression_events (
          id,
          actor_type,
          actor_id,
          xp_delta,
          shots_delta,
          kills_delta,
          headshots_delta,
          wallbangs_delta,
          cumulative_reaction_delta,
          qualifying_reaction_delta,
          qualifying_reaction_count_delta,
          fastest_reaction_candidate,
          best_score_candidate
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )`,
        [
          validated.eventId,
          actorType,
          actorId,
          validated.xpDelta,
          validated.shotsDelta,
          validated.killsDelta,
          validated.headshotsDelta,
          validated.wallbangsDelta,
          cumulativeReactionDelta,
          qualifyingReactionDelta,
          qualifyingReactionCountDelta,
          fastestReactionCandidate,
          validated.score,
        ],
      )

      await client.query(
        `UPDATE ${tableName}
         SET xp = xp + $2,
             stats = jsonb_build_object(
               'shots', COALESCE((stats->>'shots')::int, 0) + $3,
               'kills', COALESCE((stats->>'kills')::int, 0) + $4,
               'headshots', COALESCE((stats->>'headshots')::int, 0) + $5,
               'wallbangs', COALESCE((stats->>'wallbangs')::int, 0) + $6,
               'cumulativeReactionMs', COALESCE((stats->>'cumulativeReactionMs')::numeric, 0) + $7,
               'qualifyingReactionMs', COALESCE((stats->>'qualifyingReactionMs')::numeric, 0) + $8,
               'qualifyingReactionCount', COALESCE((stats->>'qualifyingReactionCount')::int, 0) + $9,
               'fastestReactionMs',
                 CASE
                   WHEN $10::numeric IS NULL THEN stats->'fastestReactionMs'
                   WHEN (stats->>'fastestReactionMs') IS NULL THEN to_jsonb($10::numeric)
                   ELSE to_jsonb(LEAST((stats->>'fastestReactionMs')::numeric, $10::numeric))
                 END,
               'bestScore', GREATEST(COALESCE((stats->>'bestScore')::int, 0), COALESCE($11, 0))
             ),
             updated_at = now()
         WHERE ${idColumn} = $1`,
        [
          actorId,
          validated.xpDelta,
          validated.shotsDelta,
          validated.killsDelta,
          validated.headshotsDelta,
          validated.wallbangsDelta,
          cumulativeReactionDelta,
          qualifyingReactionDelta,
          qualifyingReactionCountDelta,
          fastestReactionCandidate,
          validated.score,
        ],
      )
    }

    const authState = await buildAuthStateForSession(client, ensured.session)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      authState,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const submitFeedback = async (
  sessionToken: string | null,
  request: {
    category: FeedbackCategory
    body: string
  },
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    const adminState = await getAdminState(client)
    const category = request.category
    const body = sanitizeFeedbackBody(request.body)
    const activeAccount =
      ensured.authState.activeUserName === null
        ? null
        : ensured.authState.accounts.find(
            (account) => account.name === ensured.authState.activeUserName,
          ) ?? null
    const requiresAccount =
      category === 'bug-report' || category === 'feature-request'

    if (requiresAccount && !activeAccount) {
      const feedbackState = await getFeedbackState(client)
      await client.query('COMMIT')
      return {
        ok: false,
        message: `An account is required to post ${
          category === 'bug-report' ? 'bug reports' : 'feature requests'
        }.`,
        feedbackState,
        authState: ensured.authState,
        remainingMs: 0,
        sessionToken: ensured.token,
      }
    }

    if (!body) {
      const feedbackState = await getFeedbackState(client)
      await client.query('COMMIT')
      return {
        ok: false,
        message:
          category === 'bug-report'
            ? 'Write a short bug report before posting.'
            : category === 'feature-request'
              ? 'Write a feature request before posting.'
              : 'Write your feedback before posting.',
        feedbackState,
        authState: ensured.authState,
        remainingMs: 0,
        sessionToken: ensured.token,
      }
    }

    const loweredBody = body.toLowerCase()
    if (
      adminState.blockedWords.some(
        (word) => word.trim().length > 0 && loweredBody.includes(word.trim().toLowerCase()),
      )
    ) {
      const feedbackState = await getFeedbackState(client)
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'That post was blocked by the moderation filter.',
        feedbackState,
        authState: ensured.authState,
        remainingMs: 0,
        sessionToken: ensured.token,
      }
    }

    const now = normalizeNow()
    const cooldownField =
      category === 'bug-report'
        ? 'bugReportAt'
        : category === 'feature-request'
          ? 'featureRequestAt'
          : null
    const cooldownMs =
      cooldownField && activeAccount?.strictFeedbackCooldownMinutes
        ? Math.max(activeAccount.strictFeedbackCooldownMinutes, 60) * 60 * 1000
        : FEEDBACK_COOLDOWN_MS
    const remainingMs =
      cooldownField && activeAccount
        ? getCooldownRemainingMs(activeAccount.cooldowns[cooldownField], now, cooldownMs)
        : 0

    if (cooldownField && remainingMs > 0) {
      const feedbackState = await getFeedbackState(client)
      await client.query('COMMIT')
      return {
        ok: false,
        message: `Please wait before posting another ${
          category === 'bug-report' ? 'bug report' : 'feature request'
        }.`,
        feedbackState,
        authState: ensured.authState,
        remainingMs,
        sessionToken: ensured.token,
      }
    }

    const feedbackState = await getFeedbackState(client)
    if (
      adminState.spamProtectionEnabled &&
      feedbackState.posts.some(
        (post) =>
          post.category === category &&
          post.body.toLowerCase() === loweredBody &&
          post.accountName === (activeAccount?.name ?? null),
      )
    ) {
      await client.query('COMMIT')
      return {
        ok: false,
        message: 'That looks like a duplicate post.',
        feedbackState,
        authState: ensured.authState,
        remainingMs: 0,
        sessionToken: ensured.token,
      }
    }

    const post = createFeedbackPost({
      category,
      body,
      authorName: currentActorName(ensured.authState),
      accountName: activeAccount?.name ?? null,
    })
    await client.query(
      `INSERT INTO feedback_posts (
        id,
        category,
        body,
        created_at,
        author_name,
        account_name,
        status,
        pinned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        post.id,
        post.category,
        post.body,
        post.createdAt,
        post.authorName,
        post.accountName,
        post.status,
        post.pinned,
      ],
    )

    if (cooldownField && activeAccount) {
      await client.query(
        `UPDATE accounts
         SET cooldowns = jsonb_build_object(
           'bugReportAt',
           CASE
             WHEN $3 = 'bugReportAt'
               THEN to_jsonb($2::bigint)
             ELSE COALESCE(cooldowns->'bugReportAt', 'null'::jsonb)
           END,
           'featureRequestAt',
           CASE
             WHEN $3 = 'featureRequestAt'
               THEN to_jsonb($2::bigint)
             ELSE COALESCE(cooldowns->'featureRequestAt', 'null'::jsonb)
           END
         ),
         updated_at = now()
         WHERE id = $1`,
        [activeAccount.id, now, cooldownField],
      )
    }

    const nextAuthState = await buildAuthStateForSession(client, ensured.session)
    const nextFeedbackState = await getFeedbackState(client)
    await client.query('COMMIT')
    return {
      ok: true,
      message:
        category === 'bug-report'
          ? 'Bug report posted. The shared cooldown is now active for 1 hour.'
          : category === 'feature-request'
            ? 'Feature request posted. The shared cooldown is now active for 1 hour.'
            : 'Feedback posted.',
      feedbackState: nextFeedbackState,
      authState: nextAuthState,
      remainingMs: 0,
      sessionToken: ensured.token,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const syncAdminStateToServer = async (
  sessionToken: string | null,
  adminState: AdminState,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    if (!requireAdmin(ensured.authState)) {
      throw new Error('Admin access denied.')
    }

    const saved = await saveAdminState(client, adminState)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      adminState: saved,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const syncAdminFeedbackStateToServer = async (
  sessionToken: string | null,
  feedbackState: FeedbackState,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    if (!requireAdmin(ensured.authState)) {
      throw new Error('Admin access denied.')
    }

    const saved = await replaceFeedbackState(client, feedbackState)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      feedbackState: saved,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const syncAdminAuthStateToServer = async (
  sessionToken: string | null,
  authState: AuthState,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const ensured = await ensureSessionState(client, sessionToken, undefined)
    if (!requireAdmin(ensured.authState)) {
      throw new Error('Admin access denied.')
    }

    const currentAccounts = await client.query<{
      id: string
      username: string
    }>('SELECT id, username FROM accounts')
    const currentById = new Map<string, { id: string; username: string }>(
      currentAccounts.rows.map((row) => [row.id, row]),
    )
    const currentByName = new Map<string, { id: string; username: string }>(
      currentAccounts.rows.map((row) => [row.username.toLowerCase(), row]),
    )
    const incomingIds = authState.accounts
      .map((account) => account.id)
      .filter((id) => typeof id === 'string' && id.trim().length > 0)

    for (const account of authState.accounts) {
      const existing =
        currentById.get(account.id) ??
        currentByName.get(account.name.trim().toLowerCase()) ??
        null
      if (!existing) {
        continue
      }

      const isAdminAccount =
        existing.username === ADMIN_USERNAME || account.name === ADMIN_USERNAME
      await client.query(
        `UPDATE accounts
         SET username = $2,
             xp = $3,
             stats = $4::jsonb,
             cooldowns = $5::jsonb,
             badges = $6::jsonb,
             featured = $7,
             suspended = $8,
             banned = $9,
             hidden_from_leaderboard = $10,
             strict_feedback_cooldown_minutes = $11,
             name_color = $12,
             admin_notes = $13::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          existing.id,
          isAdminAccount ? ADMIN_USERNAME : sanitizeName(account.name),
          Math.max(0, Math.round(account.xp)),
          JSON.stringify(serializeStats(normalizeStats(account.stats))),
          JSON.stringify(serializeCooldowns(account.cooldowns)),
          JSON.stringify(normalizeStringList(account.badges)),
          Boolean(account.featured),
          isAdminAccount ? false : Boolean(account.suspended),
          isAdminAccount ? false : Boolean(account.banned),
          Boolean(account.hiddenFromLeaderboard),
          account.strictFeedbackCooldownMinutes ?? null,
          account.nameColor ?? null,
          JSON.stringify(normalizeStringList(account.adminNotes)),
        ],
      )
    }

    await client.query(
      `DELETE FROM accounts
       WHERE username <> $1
         AND NOT (id = ANY($2::text[]))`,
      [ADMIN_USERNAME, incomingIds],
    )

    const anonymousProfile = normalizeAnonymousProfileInput(authState.anonymousProfile)
    if (anonymousProfile.profileId) {
      await client.query(
        `UPDATE anonymous_profiles
         SET xp = $2,
             stats = $3::jsonb,
             alias = $4,
             hidden_from_leaderboard = $5,
             admin_notes = $6::jsonb,
             updated_at = now()
         WHERE profile_id = $1`,
        [
          anonymousProfile.profileId,
          anonymousProfile.xp,
          JSON.stringify(serializeStats(anonymousProfile.stats)),
          anonymousProfile.alias,
          anonymousProfile.hiddenFromLeaderboard,
          JSON.stringify(anonymousProfile.adminNotes),
        ],
      )
    }

    const nextAuthState = await buildAuthStateForSession(client, ensured.session)
    await client.query('COMMIT')
    return {
      sessionToken: ensured.token,
      authState: nextAuthState,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
