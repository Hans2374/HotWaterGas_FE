import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { CartButton } from './CartButton';
import { HeaderWishlistButton } from './HeaderWishlistButton';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from '../../hooks/useAuth';
import './CustomerHeader.css';

const GuestHeaderActions = ({ onLogin, onRegister }) => (
  <div className="customer-header-guest-actions">
    <button
      className="customer-header-guest-btn customer-header-guest-btn--outline"
      onClick={onLogin}
      type="button"
    >
      Đăng nhập
    </button>
    <button
      className="customer-header-guest-btn customer-header-guest-btn--primary"
      onClick={onRegister}
      type="button"
    >
      Đăng ký
    </button>
  </div>
);

const AuthHeaderActions = ({ onLogout }) => (
  <div className="customer-header-auth-actions">
    <CartButton />
    <ProfileMenu onLogout={onLogout} />
  </div>
);

export const CustomerHeader = () => {
  const navigate = useNavigate();
  const { token, isInitializing, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const trimmed = searchInput.trim();
      if (trimmed) {
        navigate(`/products/search?q=${encodeURIComponent(trimmed)}`);
      } else {
        navigate('/products/search');
      }
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    navigate('/products/search');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');

  return (
    <nav className="customer-header">
      <div className="customer-header-inner">
        <div className="customer-header-left">
          <Link to="/" className="customer-header-brand">
            <img
              src="/icon.png"
              alt="HotWaterGas logo"
              className="brand-logo brand-logo--customer"
            />
            <span className="brand-title">HotWaterGas</span>
          </Link>
        </div>

        <div className="customer-header-center">
          <div className="customer-header-search-box">
            <input
              type="text"
              className="customer-header-search-input"
              placeholder="Nhập tên game, nhà phát hành..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
            />
            {searchInput && (
              <button
                className="customer-header-search-clear"
                onClick={handleClearSearch}
                title="Xóa tìm kiếm"
                type="button"
              >
                <X size={14} />
              </button>
            )}
            <button
              className="customer-header-search-button"
              onClick={handleSearch}
              title="Tìm kiếm"
              type="button"
            >
              <Search size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="customer-header-right">
          {isInitializing ? (
            <div className="customer-header-skeleton" aria-hidden="true" />
          ) : token ? (
            <AuthHeaderActions onLogout={handleLogout} />
          ) : (
            <GuestHeaderActions onLogin={handleLogin} onRegister={handleRegister} />
          )}
        </div>
      </div>
    </nav>
  );
};
