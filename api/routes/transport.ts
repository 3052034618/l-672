import { Router } from 'express';
import type { Request, Response } from 'express';
import { transportOrders } from '../data/mockData.js';

const router = Router();

router.get('/active', (req: Request, res: Response) => {
  const active = transportOrders.filter(t => ['loading', 'in_transit', 'delayed'].includes(t.status));
  res.json({
    code: 200,
    message: 'success',
    data: active,
    timestamp: Date.now(),
  });
});

router.get('/', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'success',
    data: transportOrders,
    timestamp: Date.now(),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const transport = transportOrders.find(t => t.id === req.params.id);
  if (!transport) {
    return res.status(404).json({
      code: 404,
      message: '运输记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  transport.currentTemperature = 15 + Math.random() * 10;
  transport.currentHumidity = 50 + Math.random() * 30;
  if (transport.route.length > 0) {
    const lastPoint = transport.route[transport.route.length - 1];
    const progress = Math.min(1, (Date.now() - new Date(transport.startedAt).getTime()) / 1800000);
    transport.currentPosition = {
      lat: lastPoint.lat + (transport.destination.lat - lastPoint.lat) * progress * 0.1,
      lng: lastPoint.lng + (transport.destination.lng - lastPoint.lng) * progress * 0.1,
    };
  }

  res.json({
    code: 200,
    message: 'success',
    data: transport,
    timestamp: Date.now(),
  });
});

router.get('/:id/track', (req: Request, res: Response) => {
  const transport = transportOrders.find(t => t.id === req.params.id);
  if (!transport) {
    return res.status(404).json({
      code: 404,
      message: '运输记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }

  res.json({
    code: 200,
    message: 'success',
    data: {
      route: transport.route,
      currentPosition: transport.currentPosition,
      currentTemperature: transport.currentTemperature,
      currentHumidity: transport.currentHumidity,
      status: transport.status,
      alerts: transport.alerts,
      estimatedArrival: transport.estimatedArrival,
    },
    timestamp: Date.now(),
  });
});

router.post('/:id/alerts/:alertId/resolve', (req: Request, res: Response) => {
  const transport = transportOrders.find(t => t.id === req.params.id);
  if (!transport) {
    return res.status(404).json({
      code: 404,
      message: '运输记录不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  const alert = transport.alerts.find(a => a.id === req.params.alertId);
  if (!alert) {
    return res.status(404).json({
      code: 404,
      message: '告警不存在',
      data: null,
      timestamp: Date.now(),
    });
  }
  alert.resolved = true;

  res.json({
    code: 200,
    message: '告警已处理',
    data: alert,
    timestamp: Date.now(),
  });
});

export default router;
