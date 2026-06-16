import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  emergencyEvents,
  dispatchOrders,
  warehouses,
  inventoryItems,
} from '../data/mockData.js';
import type {
  MaterialDemand,
  DispatchPlan,
  DispatchOrder,
  EventType,
  EventLevel,
} from '../../shared/types.js';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: emergencyEvents,
    timestamp: Date.now(),
  });
});

router.post('/events', (req: Request, res: Response) => {
  const { title, type, level, description, location, coordinates, affectedPopulation } = req.body;
  const newEvent = {
    id: `evt-${Date.now()}`,
    title,
    type: type as EventType,
    level: level as EventLevel,
    description,
    location,
    coordinates,
    affectedPopulation,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    createdBy: '系统管理员',
  };
  emergencyEvents.push(newEvent);
  res.json({
    code: 200,
    message: '事件创建成功',
    data: newEvent,
    timestamp: Date.now(),
  });
});

router.post('/calculate-demand', (req: Request, res: Response) => {
  const { type, level, affectedPopulation } = req.body;
  const demands: MaterialDemand[] = [];
  const pop = affectedPopulation || 1000;
  const levelMultiplier = level === 'level1' ? 3 : level === 'level2' ? 2 : level === 'level3' ? 1.5 : 1;

  if (type === 'earthquake' || type === 'flood') {
    demands.push({
      materialId: 'mat-001',
      materialName: 'N95防护口罩',
      category: 'medical',
      requiredQuantity: Math.ceil(pop * 2 * levelMultiplier),
      unit: '只',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-003',
      materialName: '应急饮用水',
      category: 'food',
      requiredQuantity: Math.ceil(pop * 0.5 * levelMultiplier),
      unit: '箱',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-004',
      materialName: '救灾帐篷',
      category: 'shelter',
      requiredQuantity: Math.ceil(pop * 0.05 * levelMultiplier),
      unit: '顶',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-005',
      materialName: '折叠行军床',
      category: 'shelter',
      requiredQuantity: Math.ceil(pop * 0.2 * levelMultiplier),
      unit: '张',
      priority: 'medium',
    });
  }

  if (type === 'flood') {
    demands.push({
      materialId: 'mat-007',
      materialName: '救生衣',
      category: 'equipment',
      requiredQuantity: Math.ceil(pop * 0.3 * levelMultiplier),
      unit: '件',
      priority: 'high',
    });
  }

  if (type === 'epidemic') {
    demands.push({
      materialId: 'mat-001',
      materialName: 'N95防护口罩',
      category: 'medical',
      requiredQuantity: Math.ceil(pop * 5 * levelMultiplier),
      unit: '只',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-002',
      materialName: '医用防护服',
      category: 'medical',
      requiredQuantity: Math.ceil(pop * 0.1 * levelMultiplier),
      unit: '套',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-010',
      materialName: '急救药品包',
      category: 'medical',
      requiredQuantity: Math.ceil(pop * 0.3 * levelMultiplier),
      unit: '包',
      priority: 'high',
    });
  }

  if (type === 'fire') {
    demands.push({
      materialId: 'mat-008',
      materialName: '强光手电筒',
      category: 'equipment',
      requiredQuantity: Math.ceil(pop * 0.5 * levelMultiplier),
      unit: '个',
      priority: 'high',
    });
    demands.push({
      materialId: 'mat-009',
      materialName: '卫星电话',
      category: 'communication',
      requiredQuantity: Math.ceil(pop * 0.005 * levelMultiplier),
      unit: '台',
      priority: 'medium',
    });
  }

  res.json({
    code: 200,
    message: 'success',
    data: demands,
    timestamp: Date.now(),
  });
});

router.post('/recommend-plan', (req: Request, res: Response) => {
  const { eventId, demands, eventCoordinates } = req.body;
  const items: DispatchPlan['items'] = [];

  demands.forEach((demand: MaterialDemand) => {
    let remaining = demand.requiredQuantity;
    const sortedWarehouses = warehouses
      .filter(w => w.status === 'active')
      .map(w => {
        const dist = Math.sqrt(
          Math.pow(w.coordinates.lat - eventCoordinates.lat, 2) +
          Math.pow(w.coordinates.lng - eventCoordinates.lng, 2)
        ) * 111;
        return { warehouse: w, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance);

    for (const { warehouse, distance } of sortedWarehouses) {
      if (remaining <= 0) break;
      const inv = inventoryItems.find(
        i => i.warehouseId === warehouse.id && i.materialId === demand.materialId && i.availableQuantity > 0
      );
      if (inv) {
        const qty = Math.min(inv.availableQuantity, remaining);
        items.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          materialId: demand.materialId,
          materialName: demand.materialName,
          quantity: qty,
          unit: demand.unit,
          distance: Number(distance.toFixed(1)),
        });
        remaining -= qty;
      }
    }
  });

  const plan: DispatchPlan = {
    id: `plan-${Date.now()}`,
    eventId,
    items,
    totalCost: items.reduce((sum, i) => {
      const inv = inventoryItems.find(x => x.materialId === i.materialId);
      return sum + (inv?.unitPrice || 0) * i.quantity;
    }, 0),
    estimatedTime: Math.max(...items.map(i => Math.ceil(i.distance * 3))),
    score: 85 + Math.random() * 10,
  };

  res.json({
    code: 200,
    message: 'success',
    data: plan,
    timestamp: Date.now(),
  });
});

router.get('/dispatch', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: dispatchOrders,
    timestamp: Date.now(),
  });
});

router.post('/dispatch', (req: Request, res: Response) => {
  const { planId, eventId, eventTitle, items } = req.body;
  const newOrder: DispatchOrder = {
    id: `do-${Date.now()}`,
    planId,
    eventId,
    eventTitle,
    items,
    status: 'locked',
    lockExpireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    currentApprovalLevel: 0,
    totalApprovalLevels: 2,
    approvals: [],
    createdAt: new Date().toISOString(),
    createdBy: '系统管理员',
  };
  dispatchOrders.push(newOrder);
  res.json({
    code: 200,
    message: '调拨单创建成功，库存已锁定30分钟',
    data: newOrder,
    timestamp: Date.now(),
  });
});

router.post('/dispatch/:id/submit', (req: Request, res: Response) => {
  const order = dispatchOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      code: 404,
      message: '调拨单不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  order.status = 'pending_approval';
  order.currentApprovalLevel = 1;
  order.approvals.push({
    id: `apr-${Date.now()}`,
    orderId: order.id,
    orderType: 'dispatch',
    level: 1,
    totalLevels: 2,
    approverId: 'usr-001',
    approverName: '陈主任',
    status: 'pending',
    comment: '',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });

  res.json({
    code: 200,
    message: '已提交审批',
    data: order,
    timestamp: Date.now(),
  });
});

export default router;
