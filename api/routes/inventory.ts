import { Router } from 'express';
import type { Request, Response } from 'express';
import { inventoryItems } from '../data/mockData.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { category, warehouseId, warning } = req.query;
  let items = [...inventoryItems];

  if (category) {
    items = items.filter(i => i.category === category);
  }
  if (warehouseId) {
    items = items.filter(i => i.warehouseId === warehouseId);
  }
  if (warning === 'true') {
    items = items.filter(i => i.availableQuantity < i.threshold);
  }

  res.json({
    code: 200,
    message: 'success',
    data: items,
    timestamp: Date.now(),
  });
});

router.get('/warnings', (req: Request, res: Response) => {
  const warnings = inventoryItems.filter(i => i.availableQuantity < i.threshold);
  res.json({
    code: 200,
    message: 'success',
    data: warnings,
    timestamp: Date.now(),
  });
});

router.post('/:id/lock', (req: Request, res: Response) => {
  const { quantity } = req.body;
  const item = inventoryItems.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({
      code: 404,
      message: '库存记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  if (item.availableQuantity < quantity) {
    return res.status(400).json({
      code: 400,
      message: '可用库存不足',
      data: null,
      timestamp: Date.now(),
    });
  }
  item.lockedQuantity += quantity;
  item.availableQuantity = item.quantity - item.lockedQuantity;
  item.lastUpdated = new Date().toISOString();

  res.json({
    code: 200,
    message: '库存锁定成功',
    data: item,
    timestamp: Date.now(),
  });
});

router.post('/:id/unlock', (req: Request, res: Response) => {
  const { quantity } = req.body;
  const item = inventoryItems.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({
      code: 404,
      message: '库存记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  const unlockQty = Math.min(quantity || item.lockedQuantity, item.lockedQuantity);
  item.lockedQuantity -= unlockQty;
  item.availableQuantity = item.quantity - item.lockedQuantity;
  item.lastUpdated = new Date().toISOString();

  res.json({
    code: 200,
    message: '库存释放成功',
    data: item,
    timestamp: Date.now(),
  });
});

export default router;
