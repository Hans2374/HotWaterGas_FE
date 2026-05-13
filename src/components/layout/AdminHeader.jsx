import React, { useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileMenu } from './ProfileMenu';
import './AdminHeader.css';

export const AdminHeader = ({
  onSidebarHoverOpen,
  onSidebarHoverClose,
  onSidebarToggle
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toggleRef = useRef(null);

  const handleMouseEnter = useCallback((e) => {
    e.preventDefault();
    if (onSidebarHoverOpen) onSidebarHoverOpen();
  }, [onSidebarHoverOpen]);

  const handleMouseLeave = useCallback((e) => {
    e.preventDefault();
    if (onSidebarHoverClose) onSidebarHoverClose();
  }, [onSidebarHoverClose]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="admin-header">
      <div
        className="sidebar-trigger-zone"
        ref={toggleRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="admin-header-sidebar-toggle"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
      </div>

      <Link to="/admin/products" className="admin-header-brand">
        <h1 className="admin-header-title">HotWaterGas</h1>
      </Link>

      <div className="admin-header-spacer" />

      <div className="admin-header-actions">
        <ProfileMenu onLogout={handleLogout} />
      </div>
    </header>
  );
};
