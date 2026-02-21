import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { DietPage } from './pages/DietPage';
import { DiapersPage } from './pages/DiapersPage';
import { SleepPage } from './pages/SleepPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthProvider } from './contexts/AuthContext';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // Protects all children below
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'diet', element: <DietPage /> },
          { path: 'diapers', element: <DiapersPage /> },
          { path: 'sleep', element: <SleepPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      }
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
