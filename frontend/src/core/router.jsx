import { Routes, Route, Navigate } from "react-router-dom";
import { useSessionStore } from "../store/session.store.js";
import ChatScreen      from "../screens/chat/ChatScreen.jsx";
import LoginScreen     from "../screens/auth/LoginScreen.jsx";
import SignupScreen    from "../screens/auth/SignupScreen.jsx";
import ProfileScreen   from "../screens/ProfileScreen.jsx";
import SettingsScreen  from "../screens/SettingsScreen.jsx";
import AdminScreen     from "../screens/AdminScreen.jsx";

function Guard({ children }) {
  const user = useSessionStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const user = useSessionStore((s) => s.user);
  return !user ? children : <Navigate to="/" replace />;
}

function AdminGuard({ children }) {
  const user = useSessionStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/"        element={<Guard><ChatScreen /></Guard>} />
      <Route path="/profile" element={<Guard><ProfileScreen /></Guard>} />
      <Route path="/settings" element={<Guard><SettingsScreen /></Guard>} />
      <Route path="/admin"   element={<AdminGuard><AdminScreen /></AdminGuard>} />
      <Route path="/login"   element={<GuestOnly><LoginScreen /></GuestOnly>} />
      <Route path="/signup"  element={<GuestOnly><SignupScreen /></GuestOnly>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}
