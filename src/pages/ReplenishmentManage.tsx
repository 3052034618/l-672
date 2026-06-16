import { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  Warehouse,
  FileText,
  CheckCircle,
  Clock,
  User,
  DollarSign,
  ScanLine,
  X,
  Trash2,
  Building2,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { api } from '@/services/api';
import { formatCurrency, formatNumber, formatDateTime } from '@/utils/format';
import {
  CATEGORY_LABELS,
  type ReplenishmentItem,
  type ReplenishmentStatus,
  type ReplenishmentOrder,
  type InventoryItem,
  type Warehouse as WarehouseType,
  type MaterialCategory,
} from '../../shared/types';

const REPLENISHMENT_STATUS_LABELS: Record<ReplenishmentStatus, string> = {
  draft: '草稿',
  pending_approval: '审批中',
  approved: '已批准',
  rejected: '已驳回',
  purchasing: '采购中',
  completed: '已完成',
};

const REPLENISHMENT_STATUS_COLORS: Record<ReplenishmentStatus, string> = {
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  pending_approval: 'bg-warning-amber/20 text-warning-amber border-warning-amber/30',
  approved: 'bg-info-cyan/20 text-info-cyan border-info-cyan/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  purchasing: 'bg-alarm-orange/20 text-alarm-orange border-alarm-orange/30',
  completed: 'bg-success-green/20 text-success-green border-success-green/30',
};

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  medical: 'bg-red-500/15 text-red-400',
  food: 'bg-alarm-orange/15 text-alarm-orange',
  shelter: 'bg-purple-500/15 text-purple-400',
  equipment: 'bg-info-cyan/15 text-info-cyan',
  communication: 'bg-success-green/15 text-success-green',
  other: 'bg-slate-500/15 text-slate-400',
};

function ApprovalSteps({ currentLevel, totalLevels, approvals }: { currentLevel: number; totalLevels: number; approvals: ReplenishmentOrder['approvals'] }) {
  const steps = Array.from({ length: totalLevels }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => {
        const approval = approvals.find((a) => a.level === step);
        const isCompleted = step < currentLevel || (approval && approval.status === 'approved');
        const isCurrent = step === currentLevel && approval?.status === 'pending';
        const isRejected = approval?.status === 'rejected';

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                  isCompleted
                    ? 'bg-success-green border-success-green text-white'
                    : isRejected
                    ? 'bg-red-500 border-red-500 text-white'
                    : isCurrent
                    ? 'bg-warning-amber border-warning-amber text-white animate-pulse-slow'
                    : 'bg-surface-light border-border-dark text-slate-500'
                }`}
              >
                {isCompleted ? <CheckCircle size={14} /> : isRejected ? <X size={14} /> : step}
              </div>
              <span className={`mt-1 text-xs ${isCompleted || isCurrent || isRejected ? 'text-slate-300' : 'text-slate-600'}`}>
                {step === 1 ? '仓库申请' : step === 2 ? '财务审核' : '领导审批'}
              </span>
              {approval?.approverName && (
                <span className="text-[10px] text-slate-500 mt-0.5">{approval.approverName}</span>
              )}
            </div>
            {idx < steps.length - 1 && <div className={`h-0.5 flex-1 mx-2 mb-6 ${isCompleted ? 'bg-success-green' : 'bg-border-dark'}`} />}
          </div>
        );
      })}
    </div>
  );
}

interface FormItem extends ReplenishmentItem {
  key: string;
}

export default function ReplenishmentManage() {
  const { inventory, replenishmentOrders, warehouses, setInventory, setReplenishmentOrders } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [scanningId, setScanningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invData, repData, whData] = await Promise.all([
          api.getInventory({ warning: true }),
          api.getReplenishmentOrders(),
          api.getWarehouses(),
        ]);
        setInventory(invData);
        setReplenishmentOrders(repData);
        if (whData.length > 0) {
          setSelectedWarehouse(whData[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setInventory, setReplenishmentOrders]);

  const lowStockItems = inventory.filter((item) => item.availableQuantity < item.threshold);

  const activeWarehouses = warehouses.filter((w) => w.status === 'active');

  const handleQuickReplenish = (item: InventoryItem) => {
    setShowForm(true);
    setSelectedWarehouse(item.warehouseId);
    setFormItems([
      {
        key: `item-${Date.now()}`,
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        quantity: Math.max(item.threshold - item.availableQuantity, item.threshold),
        unit: item.unit,
        unitPrice: item.unitPrice,
        currentStock: item.availableQuantity,
        threshold: item.threshold,
      },
    ]);
  };

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        key: `item-${Date.now()}`,
        materialId: '',
        materialName: '',
        category: 'other',
        quantity: 0,
        unit: '件',
        unitPrice: 0,
        currentStock: 0,
        threshold: 0,
      },
    ]);
  };

  const handleRemoveItem = (key: string) => {
    setFormItems(formItems.filter((item) => item.key !== key));
  };

  const handleUpdateItem = (key: string, field: keyof Omit<FormItem, 'key'>, value: string | number) => {
    setFormItems(
      formItems.map((item) => (item.key === key ? { ...item, [field]: value as never } : item))
    );
  };

  const handleSubmitForm = async () => {
    if (!selectedWarehouse || formItems.length === 0) return;

    const warehouse = warehouses.find((w) => w.id === selectedWarehouse);
    if (!warehouse) return;

    const items = formItems.map(({ key: _key, ...rest }) => rest);

    try {
      await api.createReplenishment({
        warehouseId: selectedWarehouse,
        warehouseName: warehouse.name,
        items,
      });
      const updated = await api.getReplenishmentOrders();
      setReplenishmentOrders(updated);
      setShowForm(false);
      setFormItems([]);
    } catch (error) {
      console.error('创建补货申请失败:', error);
    }
  };

  const handleReceive = async (id: string) => {
    setScanningId(id);
    setTimeout(async () => {
      try {
        await api.receiveReplenishment(id);
        const updated = await api.getReplenishmentOrders();
        setReplenishmentOrders(updated);
      } catch (error) {
        console.error('签收失败:', error);
      } finally {
        setScanningId(null);
      }
    }, 1500);
  };

  const totalFormAmount = formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-info-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient mb-2">补货管理</h1>
          <p className="text-sm text-slate-400">管理物资库存预警和补货申请流程</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-alarm-blue hover:bg-alarm-blue/80 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          创建补货申请
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="card-glass rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-warning-amber" />
            <h2 className="text-lg font-semibold text-slate-200">低库存预警</h2>
            <span className="text-sm font-normal text-slate-500">({lowStockItems.length} 项)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-border-dark">
                  <th className="text-left py-3 px-4 font-medium">物资名称</th>
                  <th className="text-left py-3 px-4 font-medium">分类</th>
                  <th className="text-right py-3 px-4 font-medium">所属仓库</th>
                  <th className="text-right py-3 px-4 font-medium">当前库存</th>
                  <th className="text-right py-3 px-4 font-medium">安全阈值</th>
                  <th className="text-right py-3 px-4 font-medium">缺口</th>
                  <th className="text-right py-3 px-4 font-medium">单价</th>
                  <th className="text-center py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => {
                  const gap = Math.max(item.threshold - item.availableQuantity, 0);
                  return (
                    <tr key={item.id} className="border-b border-border-dark/50 hover:bg-surface-light/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-slate-200 font-medium">{item.materialName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[item.category]}`}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1">
                          <Warehouse size={12} className="text-info-cyan" />
                          {item.warehouseName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-red-400 font-mono font-medium">
                          {formatNumber(item.availableQuantity)} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">
                        {formatNumber(item.threshold)} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-warning-amber font-mono font-medium">
                          {formatNumber(gap)} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleQuickReplenish(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-alarm-orange/20 hover:bg-alarm-orange/30 text-alarm-orange rounded-lg transition-colors"
                        >
                          <Plus size={12} />
                          发起补货
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={20} className="text-info-cyan" />
        <h2 className="text-lg font-semibold text-slate-200">补货申请列表</h2>
        <span className="text-sm font-normal text-slate-500">({replenishmentOrders.length} 条)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {replenishmentOrders.map((order) => (
          <div key={order.id} className="card-glass rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold text-slate-100 font-mono">{order.id.toUpperCase()}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${REPLENISHMENT_STATUS_COLORS[order.status]}`}>
                    {REPLENISHMENT_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Building2 size={14} className="text-info-cyan" />
                  {order.warehouseName}
                  <span className="mx-2 text-slate-600">|</span>
                  <User size={14} />
                  {order.createdBy}
                  <span className="mx-2 text-slate-600">|</span>
                  <Clock size={14} />
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
              {(order.status === 'approved' || order.status === 'purchasing') && (
                <button
                  onClick={() => handleReceive(order.id)}
                  disabled={scanningId === order.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-success-green/20 hover:bg-success-green/30 text-success-green rounded-lg transition-colors disabled:opacity-60"
                >
                  <ScanLine size={14} className={scanningId === order.id ? 'animate-spin' : ''} />
                  {scanningId === order.id ? '签收中...' : '扫码签收'}
                </button>
              )}
            </div>

            <div className="bg-surface-light/50 rounded-lg p-3 mb-4">
              <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <Package size={12} />
                物资明细 ({order.items.length} 项)
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="text-slate-300">{item.materialName}</span>
                    </div>
                    <div className="text-slate-400 font-mono text-xs">
                      {formatNumber(item.quantity)} {item.unit} × {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border-dark/50 flex items-center justify-between">
                <span className="text-xs text-slate-400">总金额</span>
                <span className="text-lg font-bold text-alarm-orange font-mono">
                  <DollarSign size={14} className="inline" />
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>

            {order.totalApprovalLevels > 0 && (
              <div className="px-2">
                <ApprovalSteps
                  currentLevel={order.currentApprovalLevel}
                  totalLevels={order.totalApprovalLevels}
                  approvals={order.approvals}
                />
              </div>
            )}
          </div>
        ))}

        {replenishmentOrders.length === 0 && (
          <div className="col-span-2 card-glass rounded-xl p-12 flex flex-col items-center justify-center text-slate-500">
            <FileText size={48} className="mb-3 opacity-50" />
            <p>暂无补货申请</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border-dark">
              <h3 className="text-lg font-semibold text-slate-100">创建补货申请</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormItems([]);
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-slate-400 mb-2">申请仓库</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full bg-surface-light border border-border-dark rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue"
                >
                  {activeWarehouses.map((w: WarehouseType) => (
                    <option key={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-400">物资明细</label>
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs text-info-cyan hover:text-info-cyan/80 transition-colors"
                  >
                    <Plus size={14} />
                    添加物资
                  </button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={item.key} className="bg-surface-light/50 rounded-lg p-3 border border-border-dark/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">物资 #{idx + 1}</span>
                        <button
                          onClick={() => handleRemoveItem(item.key)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">物资名称</label>
                          <input
                            type="text"
                            value={item.materialName}
                            onChange={(e) => handleUpdateItem(item.key, 'materialName', e.target.value)}
                            placeholder="请输入物资名称"
                            className="w-full bg-surface border border-border-dark rounded px-2.5 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">分类</label>
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.key, 'category', e.target.value)}
                            className="w-full bg-surface border border-border-dark rounded px-2.5 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue"
                          >
                            {(Object.keys(CATEGORY_LABELS) as MaterialCategory[]).map((cat) => (
                              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">补货数量</label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleUpdateItem(item.key, 'quantity', Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-surface border border-border-dark rounded px-2.5 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">单位</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(item.key, 'unit', e.target.value)}
                            placeholder="件/箱/套..."
                            className="w-full bg-surface border border-border-dark rounded px-2.5 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">单价 (元)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleUpdateItem(item.key, 'unitPrice', Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full bg-surface border border-border-dark rounded px-2.5 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-alarm-blue font-mono"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <span className="text-xs text-slate-500">小计:</span>
                            <span className="ml-1 text-alarm-orange font-mono text-sm">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">预计总金额:</span>
                <span className="text-xl font-bold text-alarm-orange font-mono">
                  {formatCurrency(totalFormAmount)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormItems([]);
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-surface-light rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitForm}
                  disabled={!selectedWarehouse || formItems.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-alarm-blue hover:bg-alarm-blue/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  提交申请
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
