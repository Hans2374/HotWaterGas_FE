import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './ProfileMenu.css';

export const ProfileMenu = ({ onLogout }) => {
  const navigate = useNavigate();
  const { username, email, role, isAdmin, displayName } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const profileDisplayName = displayName || username || email?.split('@')[0] || 'Người dùng';

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
        aria-label="Menu hồ sơ người dùng"
      >
        <div className="profile-menu-avatar">
          {profileDisplayName.charAt(0).toUpperCase()}
        </div>
        <span className="profile-menu-username">{profileDisplayName}</span>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown">
          <div className="profile-menu-header">
            <div className="profile-menu-display-name">{profileDisplayName}</div>
            {email && <div className="profile-menu-email">{email}</div>}
          </div>
          <div className="profile-menu-divider" />
          <div className="profile-menu-role">
            {isAdmin ? '👔 Quản trị viên' : '🛍️ Khách hàng'}
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
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};
