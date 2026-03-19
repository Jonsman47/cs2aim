import { app, initializeServer } from '../server/index.ts'

let initialized: Promise<void> | null = null

export default async function handler(
  req: Parameters<typeof app>[0],
  res: Parameters<typeof app>[1],
) {
  initialized ??= initializeServer()
  await initialized
  return app(req, res)
}
