import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { DietPage } from './pages/DietPage';
import { BottlePage } from './pages/BottlePage';
import { DiapersPage } from './pages/DiapersPage';
import { SleepPage } from './pages/SleepPage';
import { SolidsPage } from './pages/SolidsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthProvider } from './contexts/AuthContext';
import { BabiesProvider } from './contexts/BabiesContext';

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
        element: (
          <BabiesProvider>
            <AppLayout />
          </BabiesProvider>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'diet', element: <DietPage /> },
          { path: 'bottle', element: <BottlePage /> },
          { path: 'diapers', element: <DiapersPage /> },
          { path: 'sleep', element: <SleepPage /> },
          { path: 'solids', element: <SolidsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'history', element: <HistoryPage /> },
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
