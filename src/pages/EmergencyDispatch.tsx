import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  MapPin,
  Users,
  FileText,
  Package,
  Lock,
  RefreshCw,
  Plus,
  Zap,
  Truck,
  Star,
  DollarSign,
  Timer,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAppStore } from '@/store';
import { formatCurrency, formatCountdown, formatDateTime, formatNumber } from '@/utils/format';
import {
  EVENT_TYPE_LABELS,
  EVENT_LEVEL_LABELS,
  DISPATCH_STATUS_LABELS,
  CATEGORY_LABELS,
} from '../../shared/types';
import type {
  EmergencyEvent,
  EventType,
  EventLevel,
  MaterialDemand,
  DispatchPlan,
  DispatchOrder,
} from '../../shared/types';

const EVENT_LEVEL_COLORS: Record<EventLevel, string> = {
  level1: 'bg-red-500/20 text-red-400 border-red-500/40',
  level2: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  level3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  level4: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
};

const EVENT_STATUS_CONFIG = {
  pending: { label: '待处理', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
  processing: { label: '处理中', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  completed: { label: '已完成', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  cancelled: { label: '已取消', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
};

const DISPATCH_STATUS_COLORS: Record<DispatchOrder['status'], string> = {
  locked: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  pending_approval: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/40',
  in_transit: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/40',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const PRIORITY_CONFIG = {
  high: { label: '高', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  medium: { label: '中', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  low: { label: '低', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
};

export default function EmergencyDispatch() {
  const { events, dispatchOrders, setEvents, setDispatchOrders } = useAppStore();

  const [selectedEvent, setSelectedEvent] = useState<EmergencyEvent | null>(null);
  const [demands, setDemands] = useState<MaterialDemand[]>([]);
  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [loading, setLoading] = useState({
    events: false,
    demands: false,
    plan: false,
    create: false,
    dispatch: false,
  });
  const [, setNow] = useState(Date.now());

  const [form, setForm] = useState({
    title: '',
    type: 'earthquake' as EventType,
    level: 'level3' as EventLevel,
    location: '',
    affectedPopulation: 1000,
    description: '',
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading((s) => ({ ...s, events: true, dispatch: true }));
    try {
      const [eventsData, dispatchData] = await Promise.all([
        api.getEvents(),
        api.getDispatchOrders(),
      ]);
      setEvents(eventsData);
      setDispatchOrders(dispatchData);
      if (eventsData.length > 0 && !selectedEvent) {
        handleSelectEvent(eventsData[0]);
      }
    } finally {
      setLoading((s) => ({ ...s, events: false, dispatch: false }));
    }
  };

  const handleSelectEvent = async (event: EmergencyEvent) => {
    setSelectedEvent(event);
    setForm({
      title: event.title,
      type: event.type,
      level: event.level,
      location: event.location,
      affectedPopulation: event.affectedPopulation,
      description: event.description,
    });
    setLoading((s) => ({ ...s, demands: true, plan: true }));
    setDemands([]);
    setPlan(null);
    try {
      const demandsData = await api.calculateDemand({
        type: event.type,
        level: event.level,
        affectedPopulation: event.affectedPopulation,
      });
      setDemands(demandsData);
      const planData = await api.recommendPlan({
        eventId: event.id,
        demands: demandsData,
        eventCoordinates: event.coordinates,
      });
      setPlan(planData);
    } finally {
      setLoading((s) => ({ ...s, demands: false, plan: false }));
    }
  };

  const handleCreateEvent = async () => {
    if (!form.title || !form.location) return;
    setLoading((s) => ({ ...s, create: true }));
    try {
      const newEvent = await api.createEvent({
        ...form,
        coordinates: { lat: 39.9042, lng: 116.4074 },
        status: 'pending',
      });
      await loadData();
      handleSelectEvent(newEvent);
    } finally {
      setLoading((s) => ({ ...s, create: false }));
    }
  };

  const handleCalculateDemands = async () => {
    if (!form.type || !form.level || !form.affectedPopulation) return;
    setLoading((s) => ({ ...s, demands: true, plan: true }));
    setDemands([]);
    setPlan(null);
    try {
      const demandsData = await api.calculateDemand({
        type: form.type,
        level: form.level,
        affectedPopulation: form.affectedPopulation,
      });
      setDemands(demandsData);
      if (selectedEvent) {
        const planData = await api.recommendPlan({
          eventId: selectedEvent.id,
          demands: demandsData,
          eventCoordinates: selectedEvent.coordinates,
        });
        setPlan(planData);
      }
    } finally {
      setLoading((s) => ({ ...s, demands: false, plan: false }));
    }
  };

  const handleCreateDispatch = async () => {
    if (!selectedEvent || !plan || plan.items.length === 0) return;
    setLoading((s) => ({ ...s, create: true }));
    try {
      await api.createDispatch({
        planId: plan.id,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        items: plan.items,
      });
      await loadData();
    } finally {
      setLoading((s) => ({ ...s, create: false }));
    }
  };

  const warehouseItems = useMemo(() => {
    if (!plan) return [];
    const map = new Map<string, { warehouseName: string; items: typeof plan.items; totalDistance: number }>();
    plan.items.forEach((item) => {
      if (!map.has(item.warehouseId)) {
        map.set(item.warehouseId, { warehouseName: item.warehouseName, items: [], totalDistance: item.distance });
      }
      map.get(item.warehouseId)!.items.push(item);
    });
    return Array.from(map.entries()).map(([id, data]) => ({ warehouseId: id, ...data }));
  }, [plan]);

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">应急调拨中心</h1>
          <p className="text-sm text-slate-400 mt-1">突发事件管理与物资智能调拨</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-700/60 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-slate-200">突发事件</h2>
              </div>
              <span className="text-xs text-slate-400">{events.length} 件</span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {loading.events ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">暂无事件</div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedEvent?.id === event.id
                        ? 'bg-cyan-500/10 border-cyan-500/40 border-glow'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-200 line-clamp-2">{event.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${EVENT_LEVEL_COLORS[event.level]}`}>
                        {EVENT_LEVEL_LABELS[event.level]}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-700/50 text-slate-300 border border-slate-600/50">
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-xs rounded border ${EVENT_STATUS_CONFIG[event.status].color}`}>
                        {EVENT_STATUS_CONFIG[event.status].label}
                      </span>
                      <span className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-slate-200">调拨单列表</h2>
              </div>
              <span className="text-xs text-slate-400">{dispatchOrders.length} 单</span>
            </div>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {loading.dispatch ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                </div>
              ) : dispatchOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">暂无调拨单</div>
              ) : (
                dispatchOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-400">{order.id.toUpperCase()}</span>
                      <span className={`px-2 py-0.5 text-xs rounded border ${DISPATCH_STATUS_COLORS[order.status]}`}>
                        {DISPATCH_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <h3 className="text-sm text-slate-200 mb-2 line-clamp-1">{order.eventTitle}</h3>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Package className="w-3 h-3" />
                        <span>{order.items.length} 项物资</span>
                      </div>
                      {order.status === 'locked' && (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Lock className="w-3 h-3" />
                          <span>{formatCountdown(order.lockExpireTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="card-glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-slate-200">事件信息</h2>
              </div>
              {selectedEvent ? (
                <span className="text-xs text-slate-400">ID: {selectedEvent.id}</span>
              ) : (
                <span className="text-xs text-cyan-400">新建事件</span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">事件标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="请输入事件标题"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">事件类型</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((k) => (
                      <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">事件级别</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as EventLevel })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    {(Object.keys(EVENT_LEVEL_LABELS) as EventLevel[]).map((k) => (
                      <option key={k} value={k}>{EVENT_LEVEL_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  发生地点
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="请输入事件发生地点"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  受灾人数
                </label>
                <input
                  type="number"
                  value={form.affectedPopulation}
                  onChange={(e) => setForm({ ...form, affectedPopulation: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">事件描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                  placeholder="请描述事件情况..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCreateEvent}
                  disabled={loading.create || !form.title || !form.location}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-600/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.create ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {selectedEvent ? '更新事件' : '新建事件'}
                </button>
                <button
                  onClick={handleCalculateDemands}
                  disabled={loading.demands || !form.affectedPopulation}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.demands ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  计算物资需求
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-6">
          <div className="card-glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-slate-200">物资需求清单</h2>
              </div>
              <span className="text-xs text-slate-400">{demands.length} 项</span>
            </div>

            {loading.demands ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : demands.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                选择或创建事件后点击"计算物资需求"
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="text-left py-2.5 px-2 text-slate-400 font-medium">物资名称</th>
                      <th className="text-left py-2.5 px-2 text-slate-400 font-medium">类别</th>
                      <th className="text-right py-2.5 px-2 text-slate-400 font-medium">需求数量</th>
                      <th className="text-center py-2.5 px-2 text-slate-400 font-medium">优先级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map((d, idx) => (
                      <tr key={idx} className="border-b border-slate-800/60">
                        <td className="py-2.5 px-2 text-slate-200">{d.materialName}</td>
                        <td className="py-2.5 px-2">
                          <span className="text-xs text-slate-400">{CATEGORY_LABELS[d.category]}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="text-slate-200 font-medium animate-number">
                            {formatNumber(d.requiredQuantity)}
                          </span>
                          <span className="text-slate-500 ml-1">{d.unit}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_CONFIG[d.priority].color}`}>
                            {PRIORITY_CONFIG[d.priority].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-slate-200">推荐调拨方案</h2>
              </div>
              {plan && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">{plan.score.toFixed(1)}</span>
                </div>
              )}
            </div>

            {loading.plan ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : !plan ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                等待计算物资需求后生成调拨方案
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                      <Star className="w-3.5 h-3.5" />
                      方案评分
                    </div>
                    <div className="text-xl font-bold text-amber-400 animate-number">{plan.score.toFixed(1)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      总费用
                    </div>
                    <div className="text-xl font-bold text-emerald-400 animate-number">{formatCurrency(plan.totalCost)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                      <Timer className="w-3.5 h-3.5" />
                      预计时间
                    </div>
                    <div className="text-xl font-bold text-cyan-400 animate-number">{plan.estimatedTime.toFixed(1)} 小时</div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {warehouseItems.map((wh) => (
                    <div key={wh.warehouseId} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-200">{wh.warehouseName}</span>
                        </div>
                        <span className="text-xs text-slate-400">距 {wh.totalDistance.toFixed(1)} km</span>
                      </div>
                      <div className="space-y-1.5">
                        {wh.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs pl-6">
                            <span className="text-slate-400">
                              <ChevronRight className="w-3 h-3 inline mr-0.5 text-slate-500" />
                              {item.materialName}
                            </span>
                            <span className="text-slate-200 font-medium animate-number">
                              {formatNumber(item.quantity)} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCreateDispatch}
                  disabled={loading.create || !selectedEvent || plan.items.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.create ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  创建调拨单并锁定库存30分钟
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
