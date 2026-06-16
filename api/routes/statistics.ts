import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  warehouses,
  inventoryItems,
  dispatchOrders,
  transportOrders,
  replenishmentOrders,
  recentActivities,
} from '../data/mockData.js';
import type { DashboardStats } from '../../shared/types.js';

const router = Router();

router.get('/dashboard', (req: Request, res: Response) => {
  const { warehouseId, category } = req.query;

  const filteredInventory = inventoryItems.filter((item) => {
    if (warehouseId && item.warehouseId !== warehouseId) return false;
    if (category && item.category !== category) return false;
    return true;
  });

  const filteredDispatches = dispatchOrders.filter((order) => {
    if (warehouseId) {
      return order.items.some((it) => it.warehouseId === warehouseId);
    }
    if (category) {
      return order.items.some((it) => {
        const inv = inventoryItems.find((i) => i.materialId === it.materialId);
        return inv?.category === category;
      });
    }
    return true;
  });

  const filteredTransports = transportOrders.filter((t) => {
    if (!warehouseId) return true;
    return true;
  });

  const totalInventory = filteredInventory.reduce((sum, i) => sum + i.quantity, 0);
  const activeWarehouseIds = new Set(filteredInventory.map((i) => i.warehouseId));
  const totalWarehouses = warehouseId
    ? warehouses.filter((w) => w.id === warehouseId && w.status === 'active').length
    : warehouses.filter((w) => w.status === 'active' && activeWarehouseIds.has(w.id)).length;

  const activeDispatches = filteredDispatches.filter((o) =>
    ['locked', 'pending_approval', 'approved', 'in_transit'].includes(o.status)
  ).length;

  const pendingApprovals = filteredDispatches
    .flatMap((o) => o.approvals.filter((a) => a.status === 'pending'))
    .length + replenishmentOrders
    .filter((r) => !warehouseId || r.warehouseId === warehouseId)
    .flatMap((o) => o.approvals.filter((a) => a.status === 'pending'))
    .length;

  const activeAlerts = filteredTransports.reduce(
    (sum, t) => sum + t.alerts.filter((a) => !a.resolved).length,
    0
  );

  const turnoverRate = (() => {
    const now = new Date();
    const data: { date: string; rate: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const baseRate = 1.2 + Math.sin(i / 5) * 0.3;
      const variance = (Math.random() - 0.5) * 0.3;
      const warehouseFactor = warehouseId ? 0.85 : 1;
      const categoryFactor = category ? 0.9 : 1;
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        rate: Number((baseRate * warehouseFactor * categoryFactor + variance).toFixed(2)),
      });
    }
    return data;
  })();

  const dispatchProgressMap = new Map<string, number>();
  const statusLabels: Record<string, string> = {
    locked: '库存锁定',
    pending_approval: '待审批',
    approved: '审批通过',
    in_transit: '运输中',
    delivered: '已送达',
  };
  filteredDispatches.forEach((o) => {
    const label = statusLabels[o.status] || o.status;
    dispatchProgressMap.set(label, (dispatchProgressMap.get(label) || 0) + 1);
  });
  const dispatchProgress = Array.from(dispatchProgressMap.entries())
    .map(([status, count]) => ({ status, count }));

  const warehouseList = warehouseId
    ? warehouses.filter((w) => w.id === warehouseId)
    : warehouses;
  const responseTime = warehouseList
    .filter((w) => w.status === 'active')
    .map((w) => {
      const baseTimes: Record<string, number> = {
        'wh-001': 12.5,
        'wh-002': 15.3,
        'wh-003': 10.8,
        'wh-004': 18.2,
        'wh-005': 22.1,
      };
      return {
        warehouse: w.name,
        avgTime: baseTimes[w.id] || 15,
      };
    });

  res.json({
    code: 200,
    message: 'success',
    data: {
      totalInventory,
      totalWarehouses,
      activeDispatches,
      pendingApprovals,
      activeAlerts,
      turnoverRate,
      dispatchProgress: dispatchProgress.length
        ? dispatchProgress
        : [
            { status: '库存锁定', count: 0 },
            { status: '待审批', count: 0 },
            { status: '审批通过', count: 0 },
            { status: '运输中', count: 0 },
            { status: '已送达', count: 0 },
          ],
      responseTime,
      recentActivities: recentActivities.slice(0, 8),
    } as DashboardStats,
    timestamp: Date.now(),
  });
});

router.get('/monthly-report', (req: Request, res: Response) => {
  const { warehouseId, category } = req.query;

  const filteredInventory = inventoryItems.filter((item) => {
    if (warehouseId && item.warehouseId !== warehouseId) return false;
    if (category && item.category !== category) return false;
    return true;
  });

  const filteredDispatches = dispatchOrders.filter((order) => {
    if (warehouseId) {
      return order.items.some((it) => it.warehouseId === warehouseId);
    }
    if (category) {
      return order.items.some((it) => {
        const inv = inventoryItems.find((i) => i.materialId === it.materialId);
        return inv?.category === category;
      });
    }
    return true;
  });

  const filteredReplenishments = replenishmentOrders.filter((r) => {
    if (warehouseId) return r.warehouseId === warehouseId;
    if (category) return r.items.some((i) => i.category === category);
    return true;
  });

  const filteredWarehouses = warehouseId
    ? warehouses.filter((w) => w.id === warehouseId)
    : warehouses;

  const report = {
    period: '2026年5月',
    generatedAt: new Date().toISOString(),
    filters: {
      warehouseId: warehouseId || '全部',
      category: category || '全部',
    },
    summary: {
      totalInventoryValue: filteredInventory.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      totalWarehouses: filteredWarehouses.length,
      totalDispatches: filteredDispatches.length,
      completedDispatches: filteredDispatches.filter((o) => o.status === 'delivered').length,
      totalReplenishments: filteredReplenishments.length,
      completedReplenishments: filteredReplenishments.filter((o) => o.status === 'completed').length,
      activeAlerts: transportOrders.reduce((sum, t) => sum + t.alerts.filter((a) => !a.resolved).length, 0),
    },
    warehouseStats: filteredWarehouses.map((w) => {
      const whInventory = filteredInventory.filter((i) => i.warehouseId === w.id);
      return {
        id: w.id,
        name: w.name,
        capacity: w.capacity,
        usedCapacity: w.usedCapacity,
        utilizationRate: ((w.usedCapacity / w.capacity) * 100).toFixed(1) + '%',
        inventoryCount: whInventory.reduce((s, i) => s + i.quantity, 0),
      };
    }),
    categoryStats: (
      category
        ? [category]
        : ['medical', 'food', 'shelter', 'equipment', 'communication', 'other']
    )
      .map((cat) => {
        const items = filteredInventory.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return {
          category: cat,
          totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
          totalValue: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
          itemCount: items.length,
          warnings: items.filter((i) => i.availableQuantity < i.threshold).length,
        };
      })
      .filter(Boolean),
  };

  res.json({
    code: 200,
    message: 'success',
    data: report,
    timestamp: Date.now(),
  });
});

export default router;
