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
import type { DashboardStats, Activity } from '../../shared/types.js';

const router = Router();

const buildFilterContext = (filterWarehouseId: string | undefined, filterCategory: string | undefined) => {
  const filteredInventory = inventoryItems.filter((item) => {
    if (filterWarehouseId && item.warehouseId !== filterWarehouseId) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    return true;
  });

  const filteredDispatches = dispatchOrders.filter((order) =>
    order.items.some((it) => {
      if (filterWarehouseId && it.warehouseId !== filterWarehouseId) return false;
      if (filterCategory) {
        const inv = inventoryItems.find((i) => i.warehouseId === it.warehouseId && i.materialId === it.materialId);
        if (!inv || inv.category !== filterCategory) return false;
      }
      return true;
    })
  );

  const filteredDispatchIds = new Set(filteredDispatches.map((o) => o.id));

  const filteredTransports = transportOrders.filter((t) => {
    if (filterWarehouseId || filterCategory) {
      return filteredDispatchIds.has(t.dispatchOrderId);
    }
    return true;
  });

  const filteredReplenishments = replenishmentOrders.filter((r) => {
    if (filterWarehouseId && r.warehouseId !== filterWarehouseId) return false;
    if (filterCategory && !r.items.some((i) => i.category === filterCategory)) return false;
    return true;
  });

  const activeWarehouseIds = new Set(filteredInventory.map((i) => i.warehouseId));
  const filteredWarehouses = warehouses.filter((w) => activeWarehouseIds.has(w.id));

  return { filteredInventory, filteredDispatches, filteredDispatchIds, filteredTransports, filteredReplenishments, filteredWarehouses, activeWarehouseIds };
};

router.get('/dashboard', (req: Request, res: Response) => {
  const { warehouseId, category } = req.query;
  const filterWarehouseId = warehouseId as string | undefined;
  const filterCategory = category as string | undefined;

  const ctx = buildFilterContext(filterWarehouseId, filterCategory);

  const totalInventory = ctx.filteredInventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalWarehouses = ctx.filteredWarehouses.filter((w) => w.status === 'active').length;

  const activeDispatches = ctx.filteredDispatches.filter((o) =>
    ['locked', 'pending_approval', 'approved', 'in_transit'].includes(o.status)
  ).length;

  const pendingApprovals =
    ctx.filteredDispatches.flatMap((o) => o.approvals.filter((a) => a.status === 'pending')).length +
    ctx.filteredReplenishments.flatMap((o) => o.approvals.filter((a) => a.status === 'pending')).length;

  const activeAlerts = ctx.filteredTransports.reduce(
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
      const factor = (filterWarehouseId ? 0.85 : 1) * (filterCategory ? 0.9 : 1);
      const rate = totalInventory > 0 ? Number((baseRate * factor + variance).toFixed(2)) : 0;
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        rate,
      });
    }
    return data;
  })();

  const statusLabels: Record<string, string> = {
    locked: '库存锁定',
    pending_approval: '待审批',
    approved: '审批通过',
    in_transit: '运输中',
    delivered: '已送达',
  };
  const dispatchProgressMap = new Map<string, number>();
  ctx.filteredDispatches.forEach((o) => {
    const label = statusLabels[o.status] || o.status;
    dispatchProgressMap.set(label, (dispatchProgressMap.get(label) || 0) + 1);
  });
  const dispatchProgress = Array.from(dispatchProgressMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const responseTime = ctx.filteredWarehouses
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

  const filteredActivities: Activity[] = recentActivities.filter((act) => {
    if (act.type === 'dispatch' || act.type === 'approval') {
      const matched = ctx.filteredDispatches.some(
        (o) => act.title.includes(o.id) || act.title.includes(o.eventTitle) || act.description.includes(o.id)
      );
      if (!matched) return false;
    }
    if (act.type === 'replenishment') {
      const matched = ctx.filteredReplenishments.some(
        (o) => act.title.includes(o.id) || act.description.includes(o.id)
      );
      if (!matched) return false;
    }
    if (act.type === 'transport' || act.type === 'alert') {
      const matched = ctx.filteredTransports.some(
        (t) => act.title.includes(t.vehicleNo) || act.description.includes(t.vehicleNo) || act.title.includes(t.id)
      );
      if (!matched) {
        if (act.type === 'alert' && act.title.includes('库存')) {
          return ctx.filteredInventory.some((i) => i.availableQuantity < i.threshold);
        }
        return false;
      }
    }
    return true;
  }).slice(0, 8);

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
      dispatchProgress,
      responseTime,
      recentActivities: filteredActivities,
    } as DashboardStats,
    timestamp: Date.now(),
  });
});

router.get('/monthly-report', (req: Request, res: Response) => {
  const { warehouseId, category } = req.query;
  const filterWarehouseId = warehouseId as string | undefined;
  const filterCategory = category as string | undefined;

  const ctx = buildFilterContext(filterWarehouseId, filterCategory);

  const catLabels: Record<string, string> = {
    medical: '医疗物资', food: '食品物资', shelter: '帐篷物资',
    equipment: '设备器材', communication: '通讯设备', other: '其他物资',
  };

  const activeAlerts = ctx.filteredTransports.reduce(
    (sum, t) => sum + t.alerts.filter((a) => !a.resolved).length,
    0
  );

  const report = {
    period: '2026年5月',
    generatedAt: new Date().toISOString(),
    filters: {
      warehouseId: filterWarehouseId
        ? warehouses.find((w) => w.id === filterWarehouseId)?.name || '全部'
        : '全部',
      category: filterCategory ? catLabels[filterCategory] || filterCategory : '全部',
    },
    summary: {
      totalInventoryValue: ctx.filteredInventory.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      totalWarehouses: ctx.filteredWarehouses.length,
      totalDispatches: ctx.filteredDispatches.length,
      completedDispatches: ctx.filteredDispatches.filter((o) => o.status === 'delivered').length,
      totalReplenishments: ctx.filteredReplenishments.length,
      completedReplenishments: ctx.filteredReplenishments.filter((o) => o.status === 'completed').length,
      activeAlerts,
    },
    warehouseStats: ctx.filteredWarehouses.map((w) => {
      const whInventory = ctx.filteredInventory.filter((i) => i.warehouseId === w.id);
      return {
        id: w.id,
        name: w.name,
        capacity: w.capacity,
        usedCapacity: w.usedCapacity,
        utilizationRate: ((w.usedCapacity / w.capacity) * 100).toFixed(1) + '%',
        inventoryCount: whInventory.reduce((s, i) => s + i.quantity, 0),
      };
    }),
    categoryStats: (filterCategory ? [filterCategory] : ['medical', 'food', 'shelter', 'equipment', 'communication', 'other'])
      .map((cat) => {
        const items = ctx.filteredInventory.filter((i) => i.category === cat);
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
