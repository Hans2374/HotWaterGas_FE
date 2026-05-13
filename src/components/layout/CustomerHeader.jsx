import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CartButton } from './CartButton';
import { HeaderWishlistButton } from './HeaderWishlistButton';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from '../../hooks/useAuth';
import './CustomerHeader.css';

export const CustomerHeader = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const trimmed = searchInput.trim();
      if (trimmed) {
        navigate(`/products/search?q=${encodeURIComponent(trimmed)}`);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="customer-header">
      <div className="customer-header-left">
        <Link to="/" className="customer-header-brand">
          HotWaterGas
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
              ✕
            </button>
          )}
          <button
            className="customer-header-search-button"
            onClick={handleSearch}
            title="Tìm kiếm"
            type="button"
          >
            🔍
          </button>
        </div>
      </div>

      <div className="customer-header-right">
        <HeaderWishlistButton />
        <CartButton />
        <ProfileMenu onLogout={handleLogout} />
      </div>
    </nav>
  );
};
