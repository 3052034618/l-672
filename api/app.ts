/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import warehouseRoutes from './routes/warehouse.js'
import inventoryRoutes from './routes/inventory.js'
import emergencyRoutes from './routes/emergency.js'
import approvalRoutes from './routes/approval.js'
import transportRoutes from './routes/transport.js'
import replenishmentRoutes from './routes/replenishment.js'
import statisticsRoutes from './routes/statistics.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/warehouses', warehouseRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/emergency', emergencyRoutes)
app.use('/api/approvals', approvalRoutes)
app.use('/api/transport', transportRoutes)
app.use('/api/replenishment', replenishmentRoutes)
app.use('/api/statistics', statisticsRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
