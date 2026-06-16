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

router.get('/dashboard', (req: Request, res: Response) => {
  const { warehouseId, category } = req.query;
  const filterWarehouseId = warehouseId as string | undefined;
  const filterCategory = category as string | undefined;

  const filteredInventory = inventoryItems.filter((item) => {
    if (filterWarehouseId && item.warehouseId !== filterWarehouseId) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    return true;
  });

  const filteredDispatches = dispatchOrders.filter((order) => {
    if (filterWarehouseId) {
      return order.items.some((it) => it.warehouseId === filterWarehouseId);
    }
    if (filterCategory) {
      return order.items.some((it) => {
        const inv = inventoryItems.find((i) => i.materialId === it.materialId);
        return inv?.category === filterCategory;
      });
    }
    return true;
  });

  const filteredTransports = transportOrders.filter((t) => {
    if (!filterWarehouseId) return true;
    return t.origin.name.includes('') || true;
  });

  const activeTransportIds = new Set(filteredTransports.map((t) => t.id));
  const activeAlerts = transportOrders
    .filter((t) => !filterWarehouseId || activeTransportIds.has(t.id))
    .reduce((sum, t) => sum + t.alerts.filter((a) => !a.resolved).length, 0);

  const totalInventory = filteredInventory.reduce((sum, i) => sum + i.quantity, 0);
  const activeWarehouseIds = new Set(filteredInventory.map((i) => i.warehouseId));
  const totalWarehouses = filterWarehouseId
    ? warehouses.filter((w) => w.id === filterWarehouseId && w.status === 'active').length
    : warehouses.filter((w) => w.status === 'active' && activeWarehouseIds.has(w.id)).length;

  const activeDispatches = filteredDispatches.filter((o) =>
    ['locked', 'pending_approval', 'approved', 'in_transit'].includes(o.status)
  ).length;

  const pendingApprovals =
    filteredDispatches.flatMap((o) => o.approvals.filter((a) => a.status === 'pending')).length +
    replenishmentOrders
      .filter((r) => !filterWarehouseId || r.warehouseId === filterWarehouseId)
      .flatMap((o) => o.approvals.filter((a) => a.status === 'pending')).length;

  const turnoverRate = (() => {
    const now = new Date();
    const data: { date: string; rate: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const baseRate = 1.2 + Math.sin(i / 5) * 0.3;
      const variance = (Math.random() - 0.5) * 0.3;
      const warehouseFactor = filterWarehouseId ? 0.85 : 1;
      const categoryFactor = filterCategory ? 0.9 : 1;
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
  const dispatchProgress = Array.from(dispatchProgressMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const warehouseList = filterWarehouseId
    ? warehouses.filter((w) => w.id === filterWarehouseId)
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

  const filteredActivities: Activity[] = recentActivities.filter((act) => {
    if (filterWarehouseId) {
      if (act.type === 'dispatch') {
        const order = filteredDispatches.find((o) => act.title.includes(o.id) || act.title.includes(o.eventTitle));
        return !!order;
      }
      if (act.type === 'replenishment') {
        return replenishmentOrders.some((r) => r.warehouseId === filterWarehouseId);
      }
      if (act.type === 'transport' || act.type === 'alert') {
        return activeTransportIds.size > 0;
      }
    }
    if (filterCategory) {
      if (act.type === 'dispatch' || act.type === 'transport') {
        return filteredDispatches.length > 0;
      }
      if (act.type === 'alert' && act.title.includes('库存')) {
        return filteredInventory.some((i) => i.availableQuantity < i.threshold);
      }
    }
    return true;
  }).slice(0, 8);

  const defaultProgress = [
    { status: '库存锁定', count: 0 },
    { status: '待审批', count: 0 },
    { status: '审批通过', count: 0 },
    { status: '运输中', count: 0 },
    { status: '已送达', count: 0 },
  ];

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
      dispatchProgress: dispatchProgress.length ? dispatchProgress : defaultProgress,
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

  const filteredInventory = inventoryItems.filter((item) => {
    if (filterWarehouseId && item.warehouseId !== filterWarehouseId) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    return true;
  });

  const filteredDispatches = dispatchOrders.filter((order) => {
    if (filterWarehouseId) {
      return order.items.some((it) => it.warehouseId === filterWarehouseId);
    }
    if (filterCategory) {
      return order.items.some((it) => {
        const inv = inventoryItems.find((i) => i.materialId === it.materialId);
        return inv?.category === filterCategory;
      });
    }
    return true;
  });

  const filteredReplenishments = replenishmentOrders.filter((r) => {
    if (filterWarehouseId) return r.warehouseId === filterWarehouseId;
    if (filterCategory) return r.items.some((i) => i.category === filterCategory);
    return true;
  });

  const filteredWarehouses = filterWarehouseId
    ? warehouses.filter((w) => w.id === filterWarehouseId)
    : warehouses;

  const catLabels: Record<string, string> = {
    medical: '医疗物资', food: '食品物资', shelter: '帐篷物资',
    equipment: '设备器材', communication: '通讯设备', other: '其他物资',
  };

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
    categoryStats: (filterCategory ? [filterCategory] : ['medical', 'food', 'shelter', 'equipment', 'communication', 'other'])
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
