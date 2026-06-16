import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Thermometer,
  Droplets,
  Clock,
  User,
  Phone,
  AlertCircle,
  Check,
  Navigation,
  QrCode,
  PackageCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '@/store';
import { api } from '@/services/api';
import { formatDateTime, formatRelativeTime, formatNumber } from '@/utils/format';
import {
  TRANSPORT_STATUS_LABELS,
  type TransportOrder,
  type TransportAlert,
  type AlertType,
  type AlertLevel,
} from '../../shared/types';

const STATUS_COLORS: Record<string, string> = {
  loading: 'bg-info-cyan/20 text-info-cyan border-info-cyan/30',
  in_transit: 'bg-success-green/20 text-success-green border-success-green/30',
  delayed: 'bg-alarm-orange/20 text-alarm-orange border-alarm-orange/30',
  arrived: 'bg-success-green/20 text-success-green border-success-green/30',
  completed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  temperature: '温度异常',
  humidity: '湿度异常',
  route: '路线偏离',
  delay: '运输延误',
  other: '其他告警',
};

const ALERT_TYPE_COLORS: Record<AlertType, string> = {
  temperature: 'text-alarm-orange',
  humidity: 'text-info-cyan',
  route: 'text-purple-400',
  delay: 'text-warning-amber',
  other: 'text-slate-400',
};

const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  warning: 'bg-warning-amber/20 text-warning-amber border-warning-amber/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  warning: '警告',
  critical: '严重',
};

function TransportMap({ transport }: { transport: TransportOrder }) {
  const { origin, destination, currentPosition, route } = transport;

  const mapWidth = 600;
  const mapHeight = 300;
  const padding = 40;

  const allLats = [origin.lat, destination.lat, ...route.map((r) => r.lat)];
  const allLngs = [origin.lng, destination.lng, ...route.map((r) => r.lng)];

  const minLat = Math.min(...allLats) - 0.02;
  const maxLat = Math.max(...allLats) + 0.02;
  const minLng = Math.min(...allLngs) - 0.02;
  const maxLng = Math.max(...allLngs) + 0.02;

  const latToY = (lat: number) => {
    return mapHeight - padding - ((lat - minLat) / (maxLat - minLat)) * (mapHeight - 2 * padding);
  };
  const lngToX = (lng: number) => {
    return padding + ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding);
  };

  const routePath = route.map((p, i) => `${i === 0 ? 'M' : 'L'} ${lngToX(p.lng)} ${latToY(p.lat)}`).join(' ');

  return (
    <div className="relative w-full h-[300px] bg-surface-light/50 rounded-lg overflow-hidden">
      <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(30, 58, 95, 0.3)" strokeWidth="1" />
          </pattern>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {routePath && (
          <path d={routePath} fill="none" stroke="url(#routeGradient)" strokeWidth="3" strokeDasharray="8 4" opacity="0.8" />
        )}

        <line
          x1={lngToX(route[0]?.lng || origin.lng)}
          y1={latToY(route[0]?.lat || origin.lat)}
          x2={lngToX(destination.lng)}
          y2={latToY(destination.lat)}
          stroke="#1e3a5f"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        <circle cx={lngToX(origin.lng)} cy={latToY(origin.lat)} r="8" fill="#06b6d4" className="animate-pulse-slow" />
        <circle cx={lngToX(origin.lng)} cy={latToY(origin.lat)} r="14" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.4" />
        <text x={lngToX(origin.lng)} y={latToY(origin.lat) - 20} textAnchor="middle" fill="#06b6d4" fontSize="11" fontWeight="500">
          起点
        </text>

        <circle cx={lngToX(destination.lng)} cy={latToY(destination.lat)} r="8" fill="#f97316" className="animate-pulse-slow" />
        <circle cx={lngToX(destination.lng)} cy={latToY(destination.lat)} r="14" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.4" />
        <text x={lngToX(destination.lng)} y={latToY(destination.lat) - 20} textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="500">
          终点
        </text>

        <g className="animate-float">
          <circle cx={lngToX(currentPosition.lng)} cy={latToY(currentPosition.lat)} r="10" fill="#10b981" />
          <circle cx={lngToX(currentPosition.lng)} cy={latToY(currentPosition.lat)} r="18" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.5">
            <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
        <text x={lngToX(currentPosition.lng)} y={latToY(currentPosition.lat) + 25} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="500">
          当前位置
        </text>
      </svg>

      <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-slate-400">
        <Navigation size={14} className="text-success-green" />
        <span>实时追踪</span>
      </div>
    </div>
  );
}

function EnvironmentChart({ transport }: { transport: TransportOrder }) {
  const data = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const baseTemp = transport.currentTemperature + (Math.random() - 0.5) * 4;
      const baseHum = transport.currentHumidity + (Math.random() - 0.5) * 10;
      result.push({
        time: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
        temperature: Number(baseTemp.toFixed(1)),
        humidity: Number(baseHum.toFixed(0)),
      });
    }
    result.push({
      time: '现在',
      temperature: transport.currentTemperature,
      humidity: transport.currentHumidity,
    });
    return result;
  }, [transport]);

  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.4)" />
          <XAxis dataKey="time" stroke="#64748b" fontSize="11" />
          <YAxis yAxisId="left" stroke="#f97316" fontSize="11" domain={[0, 40]} />
          <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize="11" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111c33',
              border: '1px solid #1e3a5f',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />

          <ReferenceLine yAxisId="left" y={transport.temperatureRange.min} stroke="#10b981" strokeDasharray="4 4" label={{ value: '低温线', fill: '#10b981', fontSize: 10 }} />
          <ReferenceLine yAxisId="left" y={transport.temperatureRange.max} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '高温线', fill: '#ef4444', fontSize: 10 }} />
          <ReferenceLine yAxisId="right" y={transport.humidityRange.min} stroke="#10b981" strokeDasharray="4 4" />
          <ReferenceLine yAxisId="right" y={transport.humidityRange.max} stroke="#ef4444" strokeDasharray="4 4" />

          <Line yAxisId="left" type="monotone" dataKey="temperature" name="温度(°C)" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 5 }} />
          <Line yAxisId="right" type="monotone" dataKey="humidity" name="湿度(%)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AlertTimeline({ alerts, onResolve }: { alerts: TransportAlert[]; onResolve: (alertId: string) => void }) {
  const sortedAlerts = [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sortedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <CheckCircle size={40} className="mb-3 text-success-green" />
        <p className="text-sm">暂无异常告警</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border-dark" />
      <div className="space-y-4">
        {sortedAlerts.map((alert) => (
          <div key={alert.id} className="relative pl-8">
            <div
              className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center ${
                alert.resolved ? 'bg-success-green/20' : alert.level === 'critical' ? 'bg-red-500/20' : 'bg-warning-amber/20'
              }`}
            >
              {alert.resolved ? (
                <Check size={12} className="text-success-green" />
              ) : (
                <AlertCircle size={12} className={alert.level === 'critical' ? 'text-red-400' : 'text-warning-amber'} />
              )}
            </div>
            <div className={`card-glass rounded-lg p-4 ${alert.resolved ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${ALERT_LEVEL_COLORS[alert.level]}`}>
                    {ALERT_LEVEL_LABELS[alert.level]}
                  </span>
                  <span className={`text-sm font-medium ${ALERT_TYPE_COLORS[alert.type]}`}>
                    {ALERT_TYPE_LABELS[alert.type]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                  <Clock size={12} />
                  {formatRelativeTime(alert.timestamp)}
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">{alert.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{formatDateTime(alert.timestamp)}</span>
                {!alert.resolved && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-alarm-blue/30 hover:bg-alarm-blue/50 text-info-cyan rounded-lg transition-colors border border-alarm-blue/30"
                  >
                    <Check size={12} />
                    处理告警
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TransportMonitor() {
  const { transportOrders, setTransportOrders, setInventory } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signoffLoading, setSignoffLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getActiveTransports();
        setTransportOrders(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setTransportOrders, selectedId]);

  const selectedTransport = transportOrders.find((t) => t.id === selectedId) || transportOrders[0];

  const handleResolveAlert = async (alertId: string) => {
    if (!selectedTransport) return;
    try {
      await api.resolveAlert(selectedTransport.id, alertId);
      const updated = await api.getActiveTransports();
      setTransportOrders(updated);
    } catch (error) {
      console.error('处理告警失败:', error);
    }
  };

  const fetchTransports = async () => {
    try {
      const data = await api.getActiveTransports();
      setTransportOrders(data);
    } catch (error) {
      console.error('刷新运输数据失败:', error);
    }
  };

  const signoffTransport = async (id: string, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmed = window.confirm(
        '确认车辆已到达，签收后将扣减对应仓库库存，是否继续？'
      );
      if (!confirmed) return;
    }
    setSignoffLoading(id);
    try {
      await api.signoffTransport(id);
      alert('扫码签收成功，库存已更新\n\n✅ 运输单状态已更新为"已到达"\n✅ 调拨单状态已更新为"已送达"\n✅ 对应仓库库存已扣减（锁定数量和实际数量同时减少）');
      await fetchTransports();
      const inventoryData = await api.getInventory();
      setInventory(inventoryData);
    } catch (error) {
      console.error('签收失败:', error);
      alert('签收失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSignoffLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-info-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gradient mb-2">运输监控</h1>
        <p className="text-sm text-slate-400">实时监控运输车辆位置、环境参数和异常告警</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Truck size={20} className="text-info-cyan" />
              运输车辆
              <span className="text-sm font-normal text-slate-500">({transportOrders.length})</span>
            </h2>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
            {transportOrders.map((transport) => {
              const unresolvedAlerts = transport.alerts.filter((a) => !a.resolved).length;
              const isSelected = selectedTransport?.id === transport.id;
              return (
                <div
                  key={transport.id}
                  onClick={() => setSelectedId(transport.id)}
                  className={`card-glass rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected ? 'border-glow border-alarm-blue/60' : 'hover:border-alarm-blue/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-100 font-mono">{transport.vehicleNo}</span>
                        {unresolvedAlerts > 0 && (
                          <span className="relative inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                            {unresolvedAlerts}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-slate-400">
                        <User size={12} />
                        {transport.driverName}
                        <span className="mx-1 text-slate-600">|</span>
                        <Phone size={12} />
                        {transport.driverPhone}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[transport.status]}`}>
                      {TRANSPORT_STATUS_LABELS[transport.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <MapPin size={12} className="text-info-cyan shrink-0" />
                    <span className="truncate">{transport.origin.name}</span>
                    <span className="text-slate-600">→</span>
                    <MapPin size={12} className="text-alarm-orange shrink-0" />
                    <span className="truncate">{transport.destination.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      <Thermometer size={12} className={transport.currentTemperature > transport.temperatureRange.max ? 'text-red-400' : 'text-alarm-orange'} />
                      <span className={transport.currentTemperature > transport.temperatureRange.max ? 'text-red-400' : 'text-slate-400'}>
                        {formatNumber(transport.currentTemperature, 1)}°C
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets size={12} className={transport.currentHumidity > transport.humidityRange.max ? 'text-red-400' : 'text-info-cyan'} />
                      <span className={transport.currentHumidity > transport.humidityRange.max ? 'text-red-400' : 'text-slate-400'}>
                        {formatNumber(transport.currentHumidity, 0)}%
                      </span>
                    </div>
                    {unresolvedAlerts > 0 && (
                      <div className="flex items-center gap-1 ml-auto text-red-400">
                        <AlertTriangle size={12} />
                        <span>{unresolvedAlerts} 告警</span>
                      </div>
                    )}
                  </div>

                  {['in_transit', 'arrived', 'delayed'].includes(transport.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        signoffTransport(transport.id);
                      }}
                      disabled={signoffLoading === transport.id}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-success-green/20 hover:bg-success-green/30 text-success-green rounded-lg transition-all border border-success-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signoffLoading === transport.id ? (
                        <div className="animate-spin w-4 h-4 border-2 border-success-green border-t-transparent rounded-full" />
                      ) : (
                        <QrCode size={16} />
                      )}
                      扫码签收
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
          {selectedTransport ? (
            <>
              {['in_transit', 'arrived', 'delayed'].includes(selectedTransport.status) && (
                <div className="card-glass rounded-xl p-5 border-success-green/40 bg-gradient-to-r from-success-green/10 to-transparent">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-success-green/20 flex items-center justify-center shrink-0">
                        <PackageCheck size={28} className="text-success-green" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 mb-1">车辆已到达？</h3>
                        <p className="text-sm text-slate-400">
                          签收后将自动更新运输单状态、调拨单状态，并扣减对应仓库库存（锁定数量和实际数量同时减少）
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => signoffTransport(selectedTransport.id)}
                      disabled={signoffLoading === selectedTransport.id}
                      className="inline-flex items-center gap-3 px-6 py-3.5 text-base font-bold bg-success-green hover:bg-success-green/90 text-white rounded-xl transition-all shadow-lg shadow-success-green/30 hover:shadow-success-green/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {signoffLoading === selectedTransport.id ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <QrCode size={22} />
                      )}
                      扫码签收并入库
                    </button>
                  </div>
                </div>
              )}

              <div className="card-glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <MapPin size={20} className="text-info-cyan" />
                    实时位置追踪
                  </h2>
                  <div className="text-xs text-slate-400">
                    预计到达: {formatDateTime(selectedTransport.estimatedArrival)}
                  </div>
                </div>
                <TransportMap transport={selectedTransport} />
              </div>

              <div className="card-glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Thermometer size={20} className="text-alarm-orange" />
                    <Droplets size={20} className="text-info-cyan" />
                    温湿度实时监控
                  </h2>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">温度范围:</span>
                      <span className="text-success-green">{selectedTransport.temperatureRange.min}°C ~ {selectedTransport.temperatureRange.max}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">湿度范围:</span>
                      <span className="text-success-green">{selectedTransport.humidityRange.min}% ~ {selectedTransport.humidityRange.max}%</span>
                    </div>
                  </div>
                </div>
                <EnvironmentChart transport={selectedTransport} />
              </div>

              <div className="card-glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-warning-amber" />
                    异常告警记录
                    <span className="text-sm font-normal text-slate-500">
                      ({selectedTransport.alerts.filter((a) => !a.resolved).length} 待处理)
                    </span>
                  </h2>
                </div>
                <AlertTimeline alerts={selectedTransport.alerts} onResolve={handleResolveAlert} />
              </div>
            </>
          ) : (
            <div className="card-glass rounded-xl p-12 flex flex-col items-center justify-center text-slate-500">
              <Truck size={48} className="mb-4 opacity-50" />
              <p>请从左侧选择一辆运输车辆</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
