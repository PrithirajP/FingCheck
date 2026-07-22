import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

// Pages & Layouts
import UserLogin from './pages/Auth/UserLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';

// User Views
import SeparationPage from './pages/SeparationPage';

// Admin Views
import SystemOverview from './pages/Admin/SystemOverview';
import UserManagement from './pages/Admin/UserManagement';
import TargetDatabase from './pages/Admin/TargetDatabase';
import AuditLogs from './pages/Admin/AuditLogs';
import OverlapAnalysis from './pages/Admin/OverlapAnalysis';

export default function App() {
  const [activeTab, setActiveTab] = useState('separation');

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Portals */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Secure User Workspace Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="user">
            <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
              {activeTab === 'separation' && <SeparationPage />}
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Secure Administrative Workspace Route */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
              
              {/* Integrated the new Overview Component */}
              {activeTab === 'overview' && <SystemOverview />}

              {activeTab === 'users' && <UserManagement />}

              {activeTab === 'targets' && <TargetDatabase />}

              {/* Overlap Analysis Admin View */}
              {activeTab === 'analysis' && <OverlapAnalysis />}

              {/* Security Audit Logs */}
              {(activeTab === 'audit' || activeTab === 'admin') && <AuditLogs />}

            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/" element={<LandingPage />} />

        {/* Catch-all Routing Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}