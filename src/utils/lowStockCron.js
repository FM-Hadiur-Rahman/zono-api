
import cron from 'node-cron'
import { prisma } from '../services/prisma.js'
export function lowStockCron() {
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] low stock sweep')
    const items = await prisma.inventoryItem.findMany({ include: { levels: true } })
    for (const item of items) {
      const level = item.levels.at(-1)?.qtyOnHand ?? 0
      if (level <= item.lowStockThreshold) {
        await prisma.lowStockAlert.create({ data: { tenantId: item.tenantId, itemId: item.id, level } })
      }
    }
  })
}
