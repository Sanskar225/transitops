import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, RoleGate } from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import DispatchRecommend from './pages/DispatchRecommend';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/Fuel';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import AuditLog from './pages/Audit';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import { CAN_ADMIN_ROLES } from './utils/constants';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <AppLayout />
            </SocketProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="trips" element={<Trips />} />
        <Route path="dispatch" element={<DispatchRecommend />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="fuel" element={<FuelLogs />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit" element={<AuditLog />} />
        <Route
          path="users"
          element={
            <RoleGateRoute />
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RoleGateRoute() {
  return (
    <RoleGate roles={CAN_ADMIN_ROLES} fallback={<NotFound />}>
      <Users />
    </RoleGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
