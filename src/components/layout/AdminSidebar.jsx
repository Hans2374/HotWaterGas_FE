import React, { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, LayoutGrid, Tag } from 'lucide-react';
import './AdminSidebar.css';

const adminNavItems = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/admin/products',
    label: 'Products',
    icon: Package,
  },
  {
    path: '/admin/categories',
    label: 'Categories',
    icon: LayoutGrid,
  },
  {
    path: '/admin/tags',
    label: 'Tags',
    icon: Tag,
  },
];

export const AdminSidebar = ({ isOpen, onHoverEnter, onHoverLeave, onClose }) => {
  const handleNavClick = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const handleMouseEnter = useCallback(() => {
    if (onHoverEnter) onHoverEnter();
  }, [onHoverEnter]);

  const handleMouseLeave = useCallback(() => {
    if (onHoverLeave) onHoverLeave();
  }, [onHoverLeave]);

  return (
    <>
      {/* Overlay — mobile/tablet only */}
      <div
        className={`admin-sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={`admin-sidebar ${isOpen ? 'open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-hidden={!isOpen}
      >
        <nav className="admin-sidebar-nav">
          <ul className="admin-sidebar-menu">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="admin-sidebar-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `admin-sidebar-link ${isActive ? 'active' : ''}`
                    }
                    onClick={handleNavClick}
                  >
                    <span className="admin-sidebar-icon">
                      <Icon size={20} />
                    </span>
                    <span className="admin-sidebar-label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};
