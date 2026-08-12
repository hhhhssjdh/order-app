import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OrderConfirm from './pages/OrderConfirm';
import OrderDetail from './pages/OrderDetail';
import MyOrders from './pages/MyOrders';
import MerchantLogin from './pages/MerchantLogin';
import MerchantOrders from './pages/MerchantOrders';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/customer/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Customer routes */}
        <Route path="/customer/login" element={<Login />} />
        <Route path="/customer/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
        <Route path="/customer/order" element={<ProtectedRoute><OrderConfirm /></ProtectedRoute>} />
        <Route path="/customer/order/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/customer/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />

        {/* Merchant routes */}
        <Route path="/merchant/login" element={<MerchantLogin />} />
        <Route path="/merchant/orders" element={<MerchantOrders />} />
      </Routes>
    </BrowserRouter>
  );
}
