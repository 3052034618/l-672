import {
  dispatchOrders,
  replenishmentOrders,
  inventoryItems,
} from '../data/mockData.js';
import type { ApprovalRecord } from '../../shared/types.js';

export const startScheduler = () => {
  setInterval(() => {
    checkExpiredLocks();
    checkExpiredApprovals();
  }, 10 * 1000);

  console.log('[Scheduler] 后台调度器已启动，每10秒检查一次');
};

const checkExpiredLocks = () => {
  const now = Date.now();
  dispatchOrders.forEach((order) => {
    if (order.status === 'locked') {
      const expireTime = new Date(order.lockExpireTime).getTime();
      if (now > expireTime) {
        console.log(`[Scheduler] 调拨单 ${order.id} 锁定超时，自动释放库存`);
        releaseOrderInventory(order);
        order.status = 'cancelled';
      }
    }

    if (order.status === 'pending_approval') {
      const expireTime = new Date(order.lockExpireTime).getTime();
      if (now > expireTime) {
        console.log(`[Scheduler] 调拨单 ${order.id} 审批超时未完成，自动释放库存`);
        releaseOrderInventory(order);
        order.status = 'cancelled';
      }
    }
  });
};

const releaseOrderInventory = (order: typeof dispatchOrders[0]) => {
  order.items.forEach((item) => {
    const inv = inventoryItems.find(
      (i) => i.warehouseId === item.warehouseId && i.materialId === item.materialId
    );
    if (inv) {
      const releaseQty = Math.min(item.quantity, inv.lockedQuantity);
      inv.lockedQuantity = Math.max(0, inv.lockedQuantity - releaseQty);
      inv.availableQuantity = inv.quantity - inv.lockedQuantity;
      inv.lastUpdated = new Date().toISOString();
    }
  });
};

const DISPATCH_APPROVERS = [
  { level: 1, name: '陈主任', id: 'usr-001' },
  { level: 2, name: '王副局长', id: 'usr-002' },
  { level: 3, name: '应急局长', id: 'usr-chief' },
];

const REPLENISH_APPROVERS = [
  { level: 1, name: '部门负责人', id: 'usr-003' },
  { level: 2, name: '财务科李科长', id: 'usr-004' },
  { level: 3, name: '分管领导', id: 'usr-005' },
  { level: 4, name: '应急局长', id: 'usr-chief' },
];

const checkExpiredApprovals = () => {
  const now = Date.now();

  dispatchOrders.forEach((order) => {
    if (!['pending_approval', 'locked'].includes(order.status)) return;
    order.approvals.forEach((approval, idx) => {
      if (approval.status === 'pending') {
        const expiresAt = new Date(approval.expiresAt).getTime();
        if (now > expiresAt) {
          console.log(`[Scheduler] 调拨审批 ${approval.id} 超时，自动升级`);
          approval.status = 'escalated';
          approval.comment = '审批超时，已自动升级';

          const approvers = DISPATCH_APPROVERS;
          const currentLevel = approval.level;
          const maxEscalateLevel = 3;

          if (currentLevel < maxEscalateLevel) {
            const nextApprover = approvers.find((a) => a.level === currentLevel + 1) || approvers[approvers.length - 1];
            order.totalApprovalLevels = Math.max(order.totalApprovalLevels, currentLevel + 1);
            order.currentApprovalLevel = currentLevel + 1;
            order.status = 'pending_approval';

            const newApproval: ApprovalRecord = {
              id: `apr-${Date.now()}-${idx}`,
              orderId: order.id,
              orderType: 'dispatch',
              level: currentLevel + 1,
              totalLevels: Math.max(order.totalApprovalLevels, currentLevel + 1),
              approverId: nextApprover.id,
              approverName: nextApprover.name,
              status: 'pending',
              comment: '',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };
            order.approvals.push(newApproval);
          }
        }
      }
    });
  });

  replenishmentOrders.forEach((order) => {
    if (order.status !== 'pending_approval') return;
    order.approvals.forEach((approval, idx) => {
      if (approval.status === 'pending') {
        const expiresAt = new Date(approval.expiresAt).getTime();
        if (now > expiresAt) {
          console.log(`[Scheduler] 补货审批 ${approval.id} 超时，自动升级`);
          approval.status = 'escalated';
          approval.comment = '审批超时，已自动升级';

          const approvers = REPLENISH_APPROVERS;
          const currentLevel = approval.level;
          const maxEscalateLevel = 4;

          if (currentLevel < maxEscalateLevel) {
            const nextApprover = approvers.find((a) => a.level === currentLevel + 1) || approvers[approvers.length - 1];
            order.totalApprovalLevels = Math.max(order.totalApprovalLevels, currentLevel + 1);
            order.currentApprovalLevel = currentLevel + 1;

            const newApproval: ApprovalRecord = {
              id: `rapr-${Date.now()}-${idx}`,
              orderId: order.id,
              orderType: 'replenishment',
              level: currentLevel + 1,
              totalLevels: Math.max(order.totalApprovalLevels, currentLevel + 1),
              approverId: nextApprover.id,
              approverName: nextApprover.name,
              status: 'pending',
              comment: '',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            order.approvals.push(newApproval);
          }
        }
      }
    });
  });
};

export const lockInventoryForOrder = (order: typeof dispatchOrders[0]) => {
  let allSuccess = true;
  order.items.forEach((item) => {
    const inv = inventoryItems.find(
      (i) => i.warehouseId === item.warehouseId && i.materialId === item.materialId
    );
    if (inv) {
      if (inv.availableQuantity >= item.quantity) {
        inv.lockedQuantity += item.quantity;
        inv.availableQuantity = inv.quantity - inv.lockedQuantity;
        inv.lastUpdated = new Date().toISOString();
      } else {
        allSuccess = false;
      }
    } else {
      allSuccess = false;
    }
  });
  return allSuccess;
};

export const deductInventoryForDelivery = (order: typeof dispatchOrders[0]) => {
  order.items.forEach((item) => {
    const inv = inventoryItems.find(
      (i) => i.warehouseId === item.warehouseId && i.materialId === item.materialId
    );
    if (inv) {
      const deductQty = Math.min(item.quantity, inv.lockedQuantity);
      inv.quantity -= deductQty;
      inv.lockedQuantity = Math.max(0, inv.lockedQuantity - deductQty);
      inv.availableQuantity = inv.quantity - inv.lockedQuantity;
      inv.lastUpdated = new Date().toISOString();
    }
  });
};
