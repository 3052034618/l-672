import { Package } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
}

export default function Empty({ title = '暂无数据', description = '请稍后再试' }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
