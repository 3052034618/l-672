import type {
  Warehouse,
  InventoryItem,
  EmergencyEvent,
  MaterialDemand,
  DispatchPlan,
  DispatchOrder,
  TransportOrder,
  ReplenishmentOrder,
  DashboardStats,
  ApprovalRecord,
  ApiResponse,
} from '../../shared/types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(BASE_URL + url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const result: ApiResponse<T> = await response.json();
  if (result.code !== 200) {
    throw new Error(result.message);
  }
  return result.data;
}

export const api = {
  getWarehouses: () => request<Warehouse[]>('/warehouses'),
  getWarehouse: (id: string) => request<Warehouse>(`/warehouses/${id}`),
  getWarehouseInventory: (id: string) => request<InventoryItem[]>(`/warehouses/${id}/inventory`),

  getInventory: (params?: { category?: string; warehouseId?: string; warning?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params?.warning) query.set('warning', 'true');
    const qs = query.toString();
    return request<InventoryItem[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  getInventoryWarnings: () => request<InventoryItem[]>('/inventory/warnings'),
  lockInventory: (id: string, quantity: number) =>
    request<InventoryItem>(`/inventory/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),
  unlockInventory: (id: string, quantity?: number) =>
    request<InventoryItem>(`/inventory/${id}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),

  getEvents: () => request<EmergencyEvent[]>('/emergency/events'),
  createEvent: (data: Partial<EmergencyEvent>) =>
    request<EmergencyEvent>('/emergency/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calculateDemand: (data: { type: string; level: string; affectedPopulation: number }) =>
    request<MaterialDemand[]>('/emergency/calculate-demand', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recommendPlan: (data: { eventId: string; demands: MaterialDemand[]; eventCoordinates: { lat: number; lng: number } }) =>
    request<DispatchPlan>('/emergency/recommend-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDispatchOrders: () => request<DispatchOrder[]>('/emergency/dispatch'),
  createDispatch: (data: { planId: string; eventId: string; eventTitle: string; items: DispatchPlan['items'] }) =>
    request<DispatchOrder>('/emergency/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submitDispatch: (id: string) =>
    request<DispatchOrder>(`/emergency/dispatch/${id}/submit`, { method: 'POST' }),

  getPendingApprovals: () =>
    request<(ApprovalRecord & { order: { id: string; title: string; type: string; totalItems: number } })[]>(
      '/approvals/pending'
    ),
  approveApproval: (id: string, comment?: string) =>
    request<ApprovalRecord>(`/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  rejectApproval: (id: string, comment?: string) =>
    request<ApprovalRecord>(`/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  getActiveTransports: () => request<TransportOrder[]>('/transport/active'),
  getTransports: () => request<TransportOrder[]>('/transport'),
  getTransport: (id: string) => request<TransportOrder>(`/transport/${id}`),
  getTransportTrack: (id: string) => request<TransportOrder>(`/transport/${id}/track`),
  resolveAlert: (transportId: string, alertId: string) =>
    request(`/transport/${transportId}/alerts/${alertId}/resolve`, { method: 'POST' }),
  signoffTransport: (id: string) =>
    request<{ transport: TransportOrder; dispatchOrder: DispatchOrder | null }>(`/transport/${id}/signoff`, {
      method: 'POST',
    }),

  getReplenishmentOrders: () => request<ReplenishmentOrder[]>('/replenishment'),
  createReplenishment: (data: { warehouseId: string; warehouseName: string; items: ReplenishmentOrder['items'] }) =>
    request<ReplenishmentOrder>('/replenishment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  receiveReplenishment: (id: string) =>
    request<ReplenishmentOrder>(`/replenishment/${id}/receive`, { method: 'POST' }),

  getDashboardStats: (params?: { warehouseId?: string | null; category?: string | null }) => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    return request<DashboardStats>(`/statistics/dashboard${qs ? `?${qs}` : ''}`);
  },
  getMonthlyReport: (params?: { warehouseId?: string | null; category?: string | null }) => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    return request(`/statistics/monthly-report${qs ? `?${qs}` : ''}`);
  },
};
