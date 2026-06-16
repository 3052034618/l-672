import {
  dispatchOrders,
  replenishmentOrders,
  inventoryItems,
} from '../data/mockData.js';
import type { ApprovalRecord, InventoryItem, MaterialCategory } from '../../shared/types.js';

interface ReplenishmentItems {
  materialId?: string;
  materialName: string;
  category?: MaterialCategory;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  currentStock?: number;
  threshold?: number;
}

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
        console.log(`[Scheduler] 调拨单 ${order.id} 锁定超时（30分钟未提交审批），自动释放库存`);
        releaseOrderInventory(order);
        order.status = 'cancelled';
      }
    }

    if (order.status === 'pending_approval') {
      const expireTime = new Date(order.lockExpireTime).getTime();
      const hasPendingOrEscalatedApproval = order.approvals.some(
        (a) => a.status === 'pending' || a.status === 'escalated'
      );
      if (now > expireTime && !hasPendingOrEscalatedApproval) {
        console.log(`[Scheduler] 调拨单 ${order.id} 审批完全结束仍未通过，释放库存`);
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

            order.lockExpireTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

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

export const lockInventoryForOrder = (order: typeof dispatchOrders[0]): boolean => {
  const snapshot: Array<{ inv: InventoryItem; originalLocked: number; originalAvailable: number }> = [];

  for (const item of order.items) {
    const inv = inventoryItems.find(
      (i) => i.warehouseId === item.warehouseId && i.materialId === item.materialId
    );
    if (!inv) {
      rollbackInventoryLock(snapshot);
      return false;
    }
    if (inv.availableQuantity < item.quantity) {
      rollbackInventoryLock(snapshot);
      return false;
    }
    snapshot.push({
      inv,
      originalLocked: inv.lockedQuantity,
      originalAvailable: inv.availableQuantity,
    });
    inv.lockedQuantity += item.quantity;
    inv.availableQuantity = inv.quantity - inv.lockedQuantity;
    inv.lastUpdated = new Date().toISOString();
  }
  return true;
};

const rollbackInventoryLock = (
  snapshot: Array<{ inv: InventoryItem; originalLocked: number; originalAvailable: number }>
) => {
  snapshot.forEach(({ inv, originalLocked, originalAvailable }) => {
    inv.lockedQuantity = originalLocked;
    inv.availableQuantity = originalAvailable;
  });
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

export const addInventoryFromReplenishment = (
  warehouseId: string,
  warehouseName: string,
  items: ReplenishmentItems[]
) => {
  items.forEach((item) => {
    const inv = inventoryItems.find(
      (i) => i.warehouseId === warehouseId && i.materialId === item.materialId
    );
    if (inv) {
      inv.quantity += item.quantity;
      inv.availableQuantity = inv.quantity - inv.lockedQuantity;
      inv.lastUpdated = new Date().toISOString();
    } else {
      const newInv: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        warehouseId,
        warehouseName,
        materialId: item.materialId || `mat-custom-${Date.now()}`,
        materialName: item.materialName,
        category: item.category || 'other',
        unit: item.unit || '件',
        quantity: item.quantity,
        lockedQuantity: 0,
        availableQuantity: item.quantity,
        threshold: item.threshold || Math.ceil(item.quantity * 0.2),
        unitPrice: item.unitPrice || 0,
        productionDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lastUpdated: new Date().toISOString(),
      };
      inventoryItems.push(newInv);
    }
  });
};
