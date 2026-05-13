import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './ProfileMenu.css';

export const ProfileMenu = ({ onLogout }) => {
  const navigate = useNavigate();
  const { username, email, role, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = username || email || 'User';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const handleViewPurchaseHistory = () => {
    setIsOpen(false);
    navigate('/account/orders');
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        className="profile-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User profile menu"
      >
        <div className="profile-menu-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="profile-menu-username">{displayName}</span>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown">
          <div className="profile-menu-header">
            <div className="profile-menu-display-name">{displayName}</div>
            {email && <div className="profile-menu-email">{email}</div>}
          </div>
          <div className="profile-menu-divider" />
          <div className="profile-menu-role">
            {isAdmin ? '👔 Admin' : '🛍️ Customer'}
          </div>
          {!isAdmin && (
            <>
              <div className="profile-menu-divider" />
              <button
                className="profile-menu-purchase-history"
                onClick={handleViewPurchaseHistory}
              >
                Lịch sử mua hàng
              </button>
            </>
          )}
          <div className="profile-menu-divider" />
          <button
            className="profile-menu-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
