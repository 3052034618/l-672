import { Router } from 'express';
import type { Request, Response } from 'express';
import { dispatchOrders, replenishmentOrders, getPendingApprovals } from '../data/mockData.js';

const router = Router();

router.get('/pending', (req: Request, res: Response) => {
  const approvals = getPendingApprovals();
  const result = approvals.map(a => {
    let orderInfo;
    if (a.orderType === 'dispatch') {
      const order = dispatchOrders.find(o => o.id === a.orderId);
      orderInfo = order ? {
        id: order.id,
        title: order.eventTitle,
        type: '调拨申请',
        totalItems: order.items.reduce((s, i) => s + i.quantity, 0),
      } : null;
    } else {
      const order = replenishmentOrders.find(o => o.id === a.orderId);
      orderInfo = order ? {
        id: order.id,
        title: `${order.warehouseName}补货申请`,
        type: '补货申请',
        totalItems: order.items.reduce((s, i) => s + i.quantity, 0),
      } : null;
    }
    return { ...a, order: orderInfo };
  });

  res.json({
    code: 200,
    message: 'success',
    data: result,
    timestamp: Date.now(),
  });
});

router.post('/:id/approve', (req: Request, res: Response) => {
  const { comment } = req.body;
  const allOrders = [...dispatchOrders, ...replenishmentOrders];
  const order = allOrders.find(o => o.approvals.some(a => a.id === req.params.id));

  if (!order) {
    return res.status(404).json({
      code: 404,
      message: '审批记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  const approval = order.approvals.find(a => a.id === req.params.id);
  if (!approval) {
    return res.status(404).json({
      code: 404,
      message: '审批记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  approval.status = 'approved';
  approval.comment = comment || '同意';

  if (approval.level < order.totalApprovalLevels) {
    order.currentApprovalLevel = approval.level + 1;
    const nextLevelNames = ['', '陈主任', '王副局长', '张局长'];
    order.approvals.push({
      id: `apr-${Date.now()}`,
      orderId: order.id,
      orderType: approval.orderType,
      level: approval.level + 1,
      totalLevels: order.totalApprovalLevels,
      approverId: `usr-${approval.level + 1}`,
      approverName: nextLevelNames[approval.level + 1] || '审批人',
      status: 'pending',
      comment: '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } else {
    order.status = 'approved' as never;
    if (approval.orderType === 'dispatch') {
      (order as typeof dispatchOrders[0]).status = 'approved';
    }
  }

  res.json({
    code: 200,
    message: '审批通过',
    data: approval,
    timestamp: Date.now(),
  });
});

router.post('/:id/reject', (req: Request, res: Response) => {
  const { comment } = req.body;
  const allOrders = [...dispatchOrders, ...replenishmentOrders];
  const order = allOrders.find(o => o.approvals.some(a => a.id === req.params.id));

  if (!order) {
    return res.status(404).json({
      code: 404,
      message: '审批记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  const approval = order.approvals.find(a => a.id === req.params.id);
  if (!approval) {
    return res.status(404).json({
      code: 404,
      message: '审批记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  approval.status = 'rejected';
  approval.comment = comment || '驳回';
  order.status = 'rejected' as never;

  res.json({
    code: 200,
    message: '审批驳回',
    data: approval,
    timestamp: Date.now(),
  });
});

export default router;
