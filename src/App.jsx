import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Interfaces from './pages/Interfaces';
import Firewall from './pages/Firewall';
import RoutesPage from './pages/Routes';
import NAT from './pages/NAT';
import QoS from './pages/QoS';
import PolicyRouting from './pages/PolicyRouting';
import Services from './pages/Services';
import System from './pages/System';
import MainLayout from './layouts/MainLayout';

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { connection } = useAuth();

  if (!connection) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // Will render the child route (e.g. Dashboard) defined in Routes
  // Note: we'll wrap this in a Layout component later
};

// Public Route Wrapper (redirects to dashboard if already logged in)
const PublicRoute = () => {
  const { connection } = useAuth();

  if (connection) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interfaces" element={<Interfaces />} />
          <Route path="/firewall" element={<Firewall />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/nat" element={<NAT />} />
          <Route path="/qos" element={<QoS />} />
          <Route path="/policy-routing" element={<PolicyRouting />} />
          <Route path="/services" element={<Services />} />
          <Route path="/system" element={<System />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

import { ConfigProvider } from './context/ConfigContext';
import ConfigBar from './components/ConfigBar';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigProvider>
          <Router>
            <AppRoutes />
            <ConfigBar />
          </Router>
        </ConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
