import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/Auth/UserLogin';
import AdminLogin from './pages/Auth/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import SeparationPage from './pages/SeparationPage';
import MatchingPage from './pages/MatchingPage';
import LandingPage from './pages/LandingPage';
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
              {activeTab === 'matching' && <MatchingPage />}
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Secure Administrative Workspace Route */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout activeTab="admin" setActiveTab={() => {}}>
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-bold text-amber-400 mb-2">System Audit Logs</h2>
                <p className="text-slate-400 text-sm">Administrative oversight for FingCheck API usage metrics and operations tracker.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/" element={<LandingPage />} />

        {/* Catch-all Routing Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}