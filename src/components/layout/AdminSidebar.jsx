import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, LayoutGrid, Tag, Users, BookOpen } from 'lucide-react';
import './AdminSidebar.css';

const adminNavItems = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    theme: 'red',
  },
  {
    path: '/admin/products',
    label: 'Products',
    icon: Package,
    theme: 'yellow',
  },
  {
    path: '/admin/categories',
    label: 'Categories',
    icon: LayoutGrid,
    theme: 'blue',
  },
  {
    path: '/admin/tags',
    label: 'Tags',
    icon: Tag,
    theme: 'green',
  },
  {
    path: '/admin/publishers',
    label: 'Publishers',
    icon: BookOpen,
    theme: 'pink',
  },
  {
    path: '/admin/developers',
    label: 'Developers',
    icon: BookOpen,
    theme: 'purple',
  },
  {
    path: '/admin/users',
    label: 'Users',
    icon: Users,
    theme: 'orange',
  },
];

export const AdminSidebar = ({ isOpen, onHoverEnter, onHoverLeave, onClose }) => {
  const location = useLocation();

  const handleNavClick = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const handleMouseEnter = useCallback(() => {
    if (onHoverEnter) onHoverEnter();
  }, [onHoverEnter]);

  const handleMouseLeave = useCallback(() => {
    if (onHoverLeave) onHoverLeave();
  }, [onHoverLeave]);

  const isActive = (item) => {
    if (item.path === '/admin/dashboard') {
      return location.pathname === item.path;
    }
    if (item.path === '/admin/products') {
      return location.pathname.startsWith('/admin/products');
    }
    if (item.path === '/admin/categories') {
      return location.pathname.startsWith('/admin/categories');
    }
    if (item.path === '/admin/tags') {
      return location.pathname.startsWith('/admin/tags');
    }
    if (item.path === '/admin/publishers') {
      return location.pathname.startsWith('/admin/publishers');
    }
    if (item.path === '/admin/developers') {
      return location.pathname.startsWith('/admin/developers');
    }
    if (item.path === '/admin/users') {
      return location.pathname.startsWith('/admin/users');
    }
    return false;
  };

  const getThemeClass = (theme) => {
    switch (theme) {
      case 'red': return 'theme-red';
      case 'yellow': return 'theme-yellow';
      case 'blue': return 'theme-blue';
      case 'green': return 'theme-green';
      case 'pink': return 'theme-pink';
      case 'purple': return 'theme-purple';
      case 'orange': return 'theme-orange';
      default: return '';
    }
  };

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
              const active = isActive(item);
              const themeClass = getThemeClass(item.theme);

              return (
                <li key={item.path} className="admin-sidebar-item">
                  <NavLink
                    to={item.path}
                    className={`admin-sidebar-link ${themeClass} ${active ? 'active' : ''}`}
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
