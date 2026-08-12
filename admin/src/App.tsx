import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dishes from './pages/Dishes';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import Whitelist from './pages/Whitelist';

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dishes" replace />} />
          <Route path="dishes" element={<Dishes />} />
          <Route path="categories" element={<Categories />} />
          <Route path="orders" element={<Orders />} />
          <Route path="whitelist" element={<Whitelist />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
