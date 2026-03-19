import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMigrations } from './db.ts'
import {
  bootstrapSession,
  fetchCommunitySnapshot,
  fetchLeaderboards,
  loginWithServer,
  logoutFromServer,
  registerWithServer,
  submitFeedback,
  syncAdminAuthStateToServer,
  syncAdminFeedbackStateToServer,
  syncAdminStateToServer,
  syncProgressionEvent,
} from './store.ts'

const SESSION_COOKIE_NAME = 'midlane_session'
const port = Number(process.env.PORT) || 3001
const app = express()

app.use(express.json({ limit: '1mb' }))

const getSessionToken = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=')
    if (rawName === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rawValueParts.join('='))
    }
  }

  return null
}

const setSessionCookie = (res: express.Response, sessionToken: string) => {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : null,
  ].filter(Boolean)
  res.setHeader('Set-Cookie', attributes.join('; '))
}

const respondWithSession = (
  res: express.Response,
  payload: Record<string, unknown> & { sessionToken: string },
) => {
  setSessionCookie(res, payload.sessionToken)
  const body = { ...payload }
  delete body.sessionToken
  res.json(body)
}

const route =
  (
    handler: (
      req: express.Request,
      res: express.Response,
    ) => Promise<void>,
  ) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res).catch(next)
  }

app.post(
  '/api/session/bootstrap',
  route(async (req, res) => {
    const payload = await bootstrapSession(getSessionToken(req.headers.cookie), req.body)
    respondWithSession(res, payload)
  }),
)

app.get(
  '/api/leaderboards',
  route(async (_req, res) => {
    const leaderboards = await fetchLeaderboards()
    res.json({ leaderboards })
  }),
)

app.get(
  '/api/community',
  route(async (req, res) => {
    const payload = await fetchCommunitySnapshot(getSessionToken(req.headers.cookie))
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/auth/register',
  route(async (req, res) => {
    const payload = await registerWithServer(
      getSessionToken(req.headers.cookie),
      req.body,
    )
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/auth/login',
  route(async (req, res) => {
    const payload = await loginWithServer(getSessionToken(req.headers.cookie), req.body)
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/auth/logout',
  route(async (req, res) => {
    const payload = await logoutFromServer(getSessionToken(req.headers.cookie))
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/progression/sync',
  route(async (req, res) => {
    const payload = await syncProgressionEvent(
      getSessionToken(req.headers.cookie),
      req.body,
    )
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/feedback',
  route(async (req, res) => {
    const payload = await submitFeedback(getSessionToken(req.headers.cookie), req.body)
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/admin/state',
  route(async (req, res) => {
    const payload = await syncAdminStateToServer(
      getSessionToken(req.headers.cookie),
      req.body.adminState,
    )
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/admin/feedback',
  route(async (req, res) => {
    const payload = await syncAdminFeedbackStateToServer(
      getSessionToken(req.headers.cookie),
      req.body.feedbackState,
    )
    respondWithSession(res, payload)
  }),
)

app.post(
  '/api/admin/auth',
  route(async (req, res) => {
    const payload = await syncAdminAuthStateToServer(
      getSessionToken(req.headers.cookie),
      req.body.authState,
    )
    respondWithSession(res, payload)
  }),
)

const rootDir = dirname(fileURLToPath(import.meta.url))
const distDir = join(rootDir, '..', 'dist')

if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(
    /^(?!\/api\/).*/,
    (_req: express.Request, res: express.Response) => {
      res.sendFile(join(distDir, 'index.html'))
    },
  )
}

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    void next
    const statusCode =
      error.message === 'Admin access denied.'
        ? 403
        : error.message === 'Invalid progression payload.'
          ? 400
          : 500
    if (statusCode >= 500) {
      console.error(error)
    }
    res.status(statusCode).json({
      message:
        statusCode >= 500
          ? 'The server could not complete that request.'
          : error.message,
    })
  },
)

const start = async () => {
  await runMigrations()
  app.listen(port, () => {
    console.log(`cs2aim backend listening on http://localhost:${port}`)
  })
}

void start()
