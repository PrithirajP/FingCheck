import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/Auth/UserLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import SeparationPage from './pages/SeparationPage';
import LandingPage from './pages/LandingPage';
import AdminLayout from './layouts/AdminLayout';
import UserManagement from './pages/Admin/UserManagement';
import TargetDatabase from './pages/Admin/TargetDatabase';
import { useState } from 'react';

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

       {/* 3. Secure Administrative Workspace Route */}
     <Route path="/admin/dashboard" element={
       <ProtectedRoute allowedRole="admin">
         <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>

           {activeTab === 'overview' && (
             <div><h2 className="text-2xl font-bold text-white mb-4">System Overview</h2></div>
           )}

           {activeTab === 'users' && <UserManagement />}

           {activeTab === 'targets' && <TargetDatabase />}

           {activeTab === 'analysis' && (
             <div><h2 className="text-2xl font-bold text-white mb-4">Overlap Analysis (Admin View)</h2></div>
           )}

           {activeTab === 'audit' && (
             <div><h2 className="text-2xl font-bold text-white mb-4">Security Audit Logs</h2></div>
           )}

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