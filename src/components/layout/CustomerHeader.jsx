import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Gamepad2, Building2, UserRound } from 'lucide-react';
import { CartButton } from './CartButton';
import { HeaderWishlistButton } from './HeaderWishlistButton';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from '../../hooks/useAuth';
import { getSearchSuggestions } from '../../api/productApi';
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

const SEARCH_DEBOUNCE_MS = 300;

const getSuggestionIcon = (type) => {
  if (type === 'Publisher') return Building2;
  if (type === 'Developer') return UserRound;
  return Gamepad2;
};

const getSuggestionBadgeClassName = (type) => {
  if (type === 'Publisher') return 'customer-header-search-badge customer-header-search-badge--publisher';
  if (type === 'Developer') return 'customer-header-search-badge customer-header-search-badge--developer';
  return 'customer-header-search-badge customer-header-search-badge--product';
};

const getSuggestionBadgeLabel = (type) => {
  if (type === 'Publisher') return 'Nhà phát hành';
  if (type === 'Developer') return 'Nhà phát triển';
  return 'Game';
};

export const CustomerHeader = () => {
  const navigate = useNavigate();
  const { token, isInitializing, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    latestQueryRef.current = trimmed;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      setIsDropdownOpen(false);
      setActiveSuggestionIndex(-1);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSuggestionsLoading(true);
      setIsDropdownOpen(true);

      try {
        const result = await getSearchSuggestions(trimmed, controller.signal);
        if (latestQueryRef.current !== trimmed) {
          return;
        }

        setSuggestions(result);
        setActiveSuggestionIndex(result.length > 0 ? 0 : -1);
      } catch (error) {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
        }
      } finally {
        if (latestQueryRef.current === trimmed) {
          setIsSuggestionsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const hasSearchText = useMemo(() => searchInput.trim().length > 0, [searchInput]);
  const shouldShowDropdown = isDropdownOpen && searchInput.trim().length >= 2;

  const navigateToSearchResults = () => {
    const trimmed = searchInput.trim();
    setIsDropdownOpen(false);
    setActiveSuggestionIndex(-1);

    if (trimmed) {
      navigate(`/products/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/products/search');
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion?.navigationUrl) {
      return;
    }

    setIsDropdownOpen(false);
    setActiveSuggestionIndex(-1);
    navigate(suggestion.navigationUrl);
  };

  const handleSearch = (e) => {
    if (e?.type === 'click') {
      navigateToSearchResults();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      if (!shouldShowDropdown) {
        if (searchInput.trim().length >= 2) {
          setIsDropdownOpen(true);
        }
        return;
      }

      event.preventDefault();
      setActiveSuggestionIndex((prev) => {
        if (suggestions.length === 0) return -1;
        return prev < suggestions.length - 1 ? prev + 1 : 0;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!shouldShowDropdown || suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      return;
    }

    if (event.key === 'Escape') {
      if (shouldShowDropdown) {
        event.preventDefault();
        setIsDropdownOpen(false);
        setActiveSuggestionIndex(-1);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (shouldShowDropdown && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleSuggestionSelect(suggestions[activeSuggestionIndex]);
        return;
      }

      navigateToSearchResults();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    setActiveSuggestionIndex(-1);
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
          <div className="customer-header-search-shell" ref={searchContainerRef}>
            <div className="customer-header-search-box">
              <input
                type="text"
                className="customer-header-search-input"
                placeholder="Tìm theo tên game, nhà phát hành hoặc nhà làm game"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => {
                  if (searchInput.trim().length >= 2) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                aria-expanded={shouldShowDropdown}
                aria-autocomplete="list"
                aria-controls="customer-header-search-suggestions"
              />
              {hasSearchText && (
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

            {shouldShowDropdown && (
              <div className="customer-header-search-dropdown" id="customer-header-search-suggestions" role="listbox">
                {isSuggestionsLoading ? (
                  <div className="customer-header-search-status">Đang tìm kiếm...</div>
                ) : suggestions.length === 0 ? (
                  <div className="customer-header-search-status">Không tìm thấy kết quả</div>
                ) : (
                  suggestions.map((suggestion, index) => {
                    const SuggestionIcon = getSuggestionIcon(suggestion.type);
                    const isActive = index === activeSuggestionIndex;

                    return (
                      <button
                        key={`${suggestion.type}-${suggestion.id}-${index}`}
                        type="button"
                        className={`customer-header-search-item ${isActive ? 'is-active' : ''}`}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        role="option"
                        aria-selected={isActive}
                      >
                        <div className="customer-header-search-item-media">
                          {suggestion.imageUrl ? (
                            <img src={suggestion.imageUrl} alt="" className="customer-header-search-item-image" />
                          ) : (
                            <div className="customer-header-search-item-fallback" aria-hidden="true">
                              <SuggestionIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="customer-header-search-item-content">
                          <span className="customer-header-search-item-name">{suggestion.name}</span>
                        </div>
                        <span className={getSuggestionBadgeClassName(suggestion.type)}>{getSuggestionBadgeLabel(suggestion.type)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
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
