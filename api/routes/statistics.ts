import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getDashboardStats,
  warehouses,
  inventoryItems,
  dispatchOrders,
  transportOrders,
  replenishmentOrders,
} from '../data/mockData.js';

const router = Router();

router.get('/dashboard', (req: Request, res: Response) => {
  const stats = getDashboardStats();
  res.json({
    code: 200,
    message: 'success',
    data: stats,
    timestamp: Date.now(),
  });
});

router.get('/monthly-report', (req: Request, res: Response) => {
  const report = {
    period: '2026年5月',
    generatedAt: new Date().toISOString(),
    summary: {
      totalInventoryValue: inventoryItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      totalWarehouses: warehouses.length,
      totalDispatches: dispatchOrders.length,
      completedDispatches: dispatchOrders.filter(o => o.status === 'delivered').length,
      totalReplenishments: replenishmentOrders.length,
      completedReplenishments: replenishmentOrders.filter(o => o.status === 'completed').length,
      activeAlerts: transportOrders.reduce((sum, t) => sum + t.alerts.filter(a => !a.resolved).length, 0),
    },
    warehouseStats: warehouses.map(w => ({
      id: w.id,
      name: w.name,
      capacity: w.capacity,
      usedCapacity: w.usedCapacity,
      utilizationRate: ((w.usedCapacity / w.capacity) * 100).toFixed(1) + '%',
      inventoryCount: inventoryItems.filter(i => i.warehouseId === w.id).reduce((s, i) => s + i.quantity, 0),
    })),
    categoryStats: ['medical', 'food', 'shelter', 'equipment', 'communication'].map(cat => {
      const items = inventoryItems.filter(i => i.category === cat);
      return {
        category: cat,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        totalValue: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        itemCount: items.length,
        warnings: items.filter(i => i.availableQuantity < i.threshold).length,
      };
    }),
  };

  res.json({
    code: 200,
    message: 'success',
    data: report,
    timestamp: Date.now(),
  });
});

export default router;
