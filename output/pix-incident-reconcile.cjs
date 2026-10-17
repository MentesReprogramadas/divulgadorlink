const { PrismaClient } = require('/app/node_modules/@prisma/client');
const { randomUUID } = require('node:crypto');
const p = new PrismaClient();
const id = '3a68e835-2c2a-4f54-87a8-2bac877a9405';
async function main() {
  const response = await fetch(`${process.env.WOOVI_API_BASE_URL || 'https://api.openpix.com.br'}/api/v1/charge/${id}`, { headers: { Authorization: process.env.WOOVI_APP_ID } });
  if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
  const { charge } = await response.json();
  const paidAt = new Date(charge.paidAt);
  if (charge.status !== 'COMPLETED' || charge.value !== 790 || charge.correlationID !== id || !Number.isFinite(paidAt.getTime())) throw new Error('Unverified payment');
  const result = await p.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM orders WHERE id = $1 FOR UPDATE', id);
    const order = await tx.order.findUnique({ where: { id }, include: { user: true, link: true, surfaces: true, events: true } });
    if (!order || order.amountCents !== charge.value || order.method !== 'PIX' || order.productCode !== 'SEARCH' || order.durationDays !== 7 || order.renewal) throw new Error('Unexpected order');
    if (paidAt < order.createdAt || paidAt > order.pixExpiresAt) throw new Error('Payment outside deadline');
    if (order.events.some(e => e.eventId === `reconciliation:${id}`)) return { replay: true };
    if (!['PENDING_PAYMENT', 'EXPIRED'].includes(order.status) || order.refundAttempts !== 0) throw new Error('Unexpected order state');
    if (order.user?.status !== 'ACTIVE' || order.user.tenantId !== order.tenantId || order.link.status !== 'PUBLISHED' || order.link.tenantId !== order.tenantId || order.link.ownerId !== order.userId) throw new Error('Ineligible owner/link');
    if (order.surfaces.length !== 1 || order.surfaces[0].surface !== 'SEARCH') throw new Error('Unexpected surfaces');
    if (await tx.promotion.count({ where: { linkId: order.linkId, surface: 'SEARCH', status: 'ACTIVE' } })) throw new Error('Existing promotion');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 86400000);
    await tx.order.update({ where: { id }, data: { status: 'PAID', paidAt } });
    await tx.payment.updateMany({ where: { orderId: id }, data: { status: 'PAID' } });
    await tx.orderSurface.updateMany({ where: { orderId: id }, data: { hold: 'RELEASED' } });
    const promotion = await tx.promotion.create({ data: { tenantId: order.tenantId, linkId: order.linkId, status: 'ACTIVE', surface: 'SEARCH', activatedAt: now, expiresAt } });
    await tx.orderEvent.create({ data: { orderId: id, eventId: `reconciliation:${id}` } });
    await tx.auditLog.create({ data: { tenantId: order.tenantId, action: 'payment.reconciled', entityType: 'Order', entityId: id, requestId: randomUUID(), before: { status: order.status }, after: { status: 'PAID', paidAt: paidAt.toISOString(), promotionId: promotion.id, reason: 'Woovi paid on time; webhook rejected' } } });
    return { orderId: id, status: 'PAID', paidAt, promotionId: promotion.id, surface: 'SEARCH', activatedAt: now, expiresAt };
  });
  console.log(JSON.stringify(result));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => p.$disconnect());
