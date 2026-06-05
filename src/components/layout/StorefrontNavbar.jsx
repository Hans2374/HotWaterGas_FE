import React from 'react';
import { NavLink } from 'react-router-dom';
import './StorefrontNavbar.css';

const tabs = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Steam Key Chính Hãng', to: '/products/search' },
  { label: 'Các Thể Loại Game Thịnh Hành', to: '/categories' },
  { label: 'Các nhà phát hành', to: '/publishers' },
  { label: 'Các nhà phát triển', to: '/developers' }
];

export const StorefrontNavbar = () => (
  <nav className="storefront-navbar" aria-label="Storefront navigation">
    <div className="storefront-navbar-inner">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `storefront-navbar-tab${isActive ? ' storefront-navbar-tab--active' : ''}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  </nav>
);
