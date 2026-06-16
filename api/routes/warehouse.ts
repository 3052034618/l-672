import { Router } from 'express';
import type { Request, Response } from 'express';
import { warehouses, inventoryItems } from '../data/mockData.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: warehouses,
    timestamp: Date.now(),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const warehouse = warehouses.find(w => w.id === req.params.id);
  if (!warehouse) {
    return res.status(404).json({
      code: 404,
      message: '仓库不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  res.json({
    code: 200,
    message: 'success',
    data: warehouse,
    timestamp: Date.now(),
  });
});

router.get('/:id/inventory', (req: Request, res: Response) => {
  const items = inventoryItems.filter(i => i.warehouseId === req.params.id);
  res.json({
    code: 200,
    message: 'success',
    data: items,
    timestamp: Date.now(),
  });
});

export default router;
