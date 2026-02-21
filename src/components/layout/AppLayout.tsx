import { Outlet, NavLink } from 'react-router-dom';
import { Home, Baby, Moon, Droplet } from 'lucide-react';

export function AppLayout() {
  return (
    <div className="app-container">
      {/* Header logic can go here if needed, keeping it simple for now */}
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.5rem' }}>
          LunaCare
        </h1>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={24} />
          <span>Inicio</span>
        </NavLink>
        
        <NavLink 
          to="/diet" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Droplet size={24} />
          <span>Dieta</span>
        </NavLink>
        
        <NavLink 
          to="/diapers" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Baby size={24} />
          <span>Pañales</span>
        </NavLink>
        
        <NavLink 
          to="/sleep" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Moon size={24} />
          <span>Sueño</span>
        </NavLink>
      </nav>
    </div>
  );
}
