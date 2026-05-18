import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { getModuleFromPath } from '../../utils/adminTheme';
import './AdminLayout.css';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const module = getModuleFromPath(location.pathname);
  const closeTimeoutRef = useRef(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleSidebarOpen = useCallback(() => {
    clearCloseTimeout();
    setSidebarOpen(true);
  }, [clearCloseTimeout]);

  const handleSidebarClose = useCallback(() => {
    clearCloseTimeout();
    setSidebarOpen(false);
  }, [clearCloseTimeout]);

  const handleSidebarHoverOpen = useCallback(() => {
    clearCloseTimeout();
    setSidebarOpen(true);
  }, [clearCloseTimeout]);

  const handleSidebarHoverClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 150);
  }, [clearCloseTimeout]);

  return (
    <div className={`admin-layout module-${module}`}>
      <AdminHeader
        onSidebarHoverOpen={handleSidebarHoverOpen}
        onSidebarHoverClose={handleSidebarHoverClose}
        onSidebarToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <AdminSidebar
        isOpen={sidebarOpen}
        onHoverEnter={handleSidebarHoverOpen}
        onHoverLeave={handleSidebarHoverClose}
        onClose={handleSidebarClose}
      />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};
