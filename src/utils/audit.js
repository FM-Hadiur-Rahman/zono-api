
import { prisma } from '../services/prisma.js'
export async function audit({ tenantId, userId, action, entity, entityId, before, after }) {
  try { await prisma.auditLog.create({ data: { tenantId, userId, action, entity, entityId, before, after } }) }
  catch (e) { console.error('audit error', e.message) }
}
