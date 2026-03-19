import { app, initializeServer } from './index.ts'

let initialized: Promise<void> | null = null

export const handleVercelRequest = async (
  req: Parameters<typeof app>[0],
  res: Parameters<typeof app>[1],
) => {
  initialized ??= initializeServer()
  await initialized
  return app(req, res)
}
