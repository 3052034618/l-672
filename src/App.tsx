import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import WarehouseList from '@/pages/WarehouseList';
import InventoryMonitor from '@/pages/InventoryMonitor';
import EmergencyDispatch from '@/pages/EmergencyDispatch';
import ApprovalCenter from '@/pages/ApprovalCenter';
import TransportMonitor from '@/pages/TransportMonitor';
import ReplenishmentManage from '@/pages/ReplenishmentManage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/warehouses" element={<WarehouseList />} />
          <Route path="/inventory" element={<InventoryMonitor />} />
          <Route path="/emergency" element={<EmergencyDispatch />} />
          <Route path="/approvals" element={<ApprovalCenter />} />
          <Route path="/transport" element={<TransportMonitor />} />
          <Route path="/replenish" element={<ReplenishmentManage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
