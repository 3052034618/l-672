import { create } from 'zustand';
import type {
  DashboardStats,
  Warehouse,
  InventoryItem,
  DispatchOrder,
  TransportOrder,
  ReplenishmentOrder,
  EmergencyEvent,
  MaterialCategory,
} from '../../shared/types';

interface AppState {
  dashboard: DashboardStats | null;
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  dispatchOrders: DispatchOrder[];
  transportOrders: TransportOrder[];
  replenishmentOrders: ReplenishmentOrder[];
  events: EmergencyEvent[];
  filters: {
    warehouseId: string | null;
    category: MaterialCategory | null;
  };
  lastUpdate: number;
  setDashboard: (data: DashboardStats) => void;
  setWarehouses: (data: Warehouse[]) => void;
  setInventory: (data: InventoryItem[]) => void;
  setDispatchOrders: (data: DispatchOrder[]) => void;
  setTransportOrders: (data: TransportOrder[]) => void;
  setReplenishmentOrders: (data: ReplenishmentOrder[]) => void;
  setEvents: (data: EmergencyEvent[]) => void;
  setFilter: (key: 'warehouseId' | 'category', value: string | null) => void;
  updateTimestamp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  dashboard: null,
  warehouses: [],
  inventory: [],
  dispatchOrders: [],
  transportOrders: [],
  replenishmentOrders: [],
  events: [],
  filters: {
    warehouseId: null,
    category: null,
  },
  lastUpdate: Date.now(),
  setDashboard: (data) => set({ dashboard: data, lastUpdate: Date.now() }),
  setWarehouses: (data) => set({ warehouses: data }),
  setInventory: (data) => set({ inventory: data }),
  setDispatchOrders: (data) => set({ dispatchOrders: data }),
  setTransportOrders: (data) => set({ transportOrders: data }),
  setReplenishmentOrders: (data) => set({ replenishmentOrders: data }),
  setEvents: (data) => set({ events: data }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value as never },
    })),
  updateTimestamp: () => set({ lastUpdate: Date.now() }),
}));
