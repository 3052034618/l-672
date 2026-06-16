import { Router } from 'express';
import type { Request, Response } from 'express';
import { replenishmentOrders, inventoryItems } from '../data/mockData.js';
import type { ReplenishmentOrder } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: replenishmentOrders,
    timestamp: Date.now(),
  });
});

router.post('/', (req: Request, res: Response) => {
  const { warehouseId, warehouseName, items } = req.body;
  const totalAmount = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);

  const newOrder: ReplenishmentOrder = {
    id: `ro-${Date.now()}`,
    warehouseId,
    warehouseName,
    items,
    totalAmount,
    status: 'pending_approval',
    currentApprovalLevel: 1,
    totalApprovalLevels: 3,
    approvals: [
      {
        id: `rapr-${Date.now()}`,
        orderId: `ro-${Date.now()}`,
        orderType: 'replenishment',
        level: 1,
        totalLevels: 3,
        approverId: 'usr-003',
        approverName: '部门负责人',
        status: 'pending',
        comment: '',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    createdBy: '仓库管理员',
  };
  replenishmentOrders.push(newOrder);

  res.json({
    code: 200,
    message: '补货申请创建成功',
    data: newOrder,
    timestamp: Date.now(),
  });
});

router.post('/:id/receive', (req: Request, res: Response) => {
  const order = replenishmentOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      code: 404,
      message: '补货申请不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  order.items.forEach(item => {
    const inv = inventoryItems.find(i => i.warehouseId === order.warehouseId && i.materialId === item.materialId);
    if (inv) {
      inv.quantity += item.quantity;
      inv.availableQuantity = inv.quantity - inv.lockedQuantity;
      inv.lastUpdated = new Date().toISOString();
    }
  });

  order.status = 'completed';

  res.json({
    code: 200,
    message: '物资已签收入库',
    data: order,
    timestamp: Date.now(),
  });
});

export default router;
