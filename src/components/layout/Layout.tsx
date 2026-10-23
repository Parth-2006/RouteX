import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  return (
    <div className="min-h-screen bg-navy-900 text-gray-200">
      <Navbar />
      <main className={isMapPage ? 'w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-3' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6'}>
        <Outlet />
      </main>
    </div>
  );
}

