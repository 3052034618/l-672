export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  capacity: number;
  usedCapacity: number;
  manager: string;
  phone: string;
  status: 'active' | 'maintenance' | 'closed';
  temperature: number;
  humidity: number;
}

export type MaterialCategory = 'medical' | 'food' | 'shelter' | 'equipment' | 'communication' | 'other';

export interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  unit: string;
  quantity: number;
  lockedQuantity: number;
  availableQuantity: number;
  threshold: number;
  unitPrice: number;
  productionDate: string;
  expiryDate: string;
  lastUpdated: string;
}

export type EventType = 'earthquake' | 'flood' | 'fire' | 'epidemic' | 'typhoon' | 'other';
export type EventLevel = 'level1' | 'level2' | 'level3' | 'level4';

export interface EmergencyEvent {
  id: string;
  title: string;
  type: EventType;
  level: EventLevel;
  description: string;
  location: string;
  coordinates: { lat: number; lng: number };
  affectedPopulation: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface MaterialDemand {
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  requiredQuantity: number;
  unit: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DispatchItem {
  warehouseId: string;
  warehouseName: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  distance: number;
}

export interface DispatchPlan {
  id: string;
  eventId: string;
  items: DispatchItem[];
  totalCost: number;
  estimatedTime: number;
  score: number;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
export type DispatchOrderStatus = 'locked' | 'pending_approval' | 'approved' | 'rejected' | 'in_transit' | 'delivered' | 'cancelled';

export interface ApprovalRecord {
  id: string;
  orderId: string;
  orderType: 'dispatch' | 'replenishment';
  level: number;
  totalLevels: number;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  comment: string;
  createdAt: string;
  expiresAt: string;
}

export interface DispatchOrder {
  id: string;
  planId: string;
  eventId: string;
  eventTitle: string;
  items: DispatchItem[];
  status: DispatchOrderStatus;
  lockExpireTime: string;
  currentApprovalLevel: number;
  totalApprovalLevels: number;
  approvals: ApprovalRecord[];
  createdAt: string;
  createdBy: string;
}

export type TransportStatus = 'loading' | 'in_transit' | 'delayed' | 'arrived' | 'completed';
export type AlertType = 'temperature' | 'humidity' | 'route' | 'delay' | 'other';
export type AlertLevel = 'warning' | 'critical';

export interface TransportAlert {
  id: string;
  transportId: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface TransportOrder {
  id: string;
  dispatchOrderId: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  status: TransportStatus;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  currentPosition: { lat: number; lng: number };
  currentTemperature: number;
  currentHumidity: number;
  temperatureRange: { min: number; max: number };
  humidityRange: { min: number; max: number };
  alerts: TransportAlert[];
  estimatedArrival: string;
  route: RoutePoint[];
  startedAt: string;
}

export type ReplenishmentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'purchasing' | 'completed';

export interface ReplenishmentItem {
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  currentStock: number;
  threshold: number;
}

export interface ReplenishmentOrder {
  id: string;
  warehouseId: string;
  warehouseName: string;
  items: ReplenishmentItem[];
  totalAmount: number;
  status: ReplenishmentStatus;
  currentApprovalLevel: number;
  totalApprovalLevels: number;
  approvals: ApprovalRecord[];
  createdAt: string;
  createdBy: string;
}

export interface Activity {
  id: string;
  type: 'dispatch' | 'replenishment' | 'transport' | 'alert' | 'approval';
  title: string;
  description: string;
  timestamp: string;
  level: 'info' | 'warning' | 'critical';
}

export interface DashboardStats {
  totalInventory: number;
  totalWarehouses: number;
  activeDispatches: number;
  pendingApprovals: number;
  activeAlerts: number;
  turnoverRate: { date: string; rate: number }[];
  dispatchProgress: { status: string; count: number }[];
  responseTime: { warehouse: string; avgTime: number }[];
  recentActivities: Activity[];
}

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  medical: '医疗物资',
  food: '食品物资',
  shelter: '帐篷物资',
  equipment: '设备器材',
  communication: '通讯设备',
  other: '其他物资',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  earthquake: '地震',
  flood: '洪涝',
  fire: '火灾',
  epidemic: '疫情',
  typhoon: '台风',
  other: '其他',
};

export const EVENT_LEVEL_LABELS: Record<EventLevel, string> = {
  level1: '特别重大',
  level2: '重大',
  level3: '较大',
  level4: '一般',
};

export const DISPATCH_STATUS_LABELS: Record<DispatchOrderStatus, string> = {
  locked: '库存锁定',
  pending_approval: '待审批',
  approved: '审批通过',
  rejected: '审批驳回',
  in_transit: '运输中',
  delivered: '已送达',
  cancelled: '已取消',
};

export const TRANSPORT_STATUS_LABELS: Record<TransportStatus, string> = {
  loading: '装车中',
  in_transit: '运输中',
  delayed: '已延误',
  arrived: '已到达',
  completed: '已完成',
};
