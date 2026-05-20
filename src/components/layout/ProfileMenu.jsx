import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, Heart, LogOut } from 'lucide-react';
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

  const handleViewProfile = () => {
    setIsOpen(false);
    navigate('/account/profile');
  };

  const handleViewPurchaseHistory = () => {
    setIsOpen(false);
    navigate('/account/orders');
  };

  const handleViewWishlist = () => {
    setIsOpen(false);
    navigate('/wishlist');
  };

  const handleViewAdminPanel = () => {
    setIsOpen(false);
    navigate('/admin');
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        className="profile-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu hồ sơ người dùng"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="profile-menu-avatar">
          {profileDisplayName.charAt(0).toUpperCase()}
        </div>
        <span className="profile-menu-username">{profileDisplayName}</span>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown" role="menu" aria-label="Tài khoản">
          <div className="profile-menu-header">
            <div className="profile-menu-display-name">{profileDisplayName}</div>
            {email && <div className="profile-menu-email">{email}</div>}
          </div>
          <div className="profile-menu-divider" />
          <div className="profile-menu-role">
            {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
          </div>

          {!isAdmin && (
            <>
              <div className="profile-menu-divider" />
              <button className="profile-menu-item" onClick={handleViewProfile} role="menuitem">
                <User size={15} strokeWidth={1.75} />
                Hồ sơ
              </button>
              <button className="profile-menu-item" onClick={handleViewPurchaseHistory} role="menuitem">
                <Package size={15} strokeWidth={1.75} />
                Đơn hàng
              </button>
              <button className="profile-menu-item profile-menu-item--wishlist" onClick={handleViewWishlist} role="menuitem">
                <Heart size={15} strokeWidth={1.75} />
                Yêu thích
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <div className="profile-menu-divider" />
              <button className="profile-menu-item" onClick={handleViewAdminPanel} role="menuitem">
                <Package size={15} strokeWidth={1.75} />
                Trang quản trị
              </button>
            </>
          )}

          <div className="profile-menu-divider" />
          <button
            className="profile-menu-item profile-menu-item--logout"
            onClick={handleLogout}
            role="menuitem"
          >
            <LogOut size={15} strokeWidth={1.75} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};
