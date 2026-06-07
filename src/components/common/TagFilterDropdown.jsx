import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import './TagFilterDropdown.css';

export const TagFilterDropdown = ({
  tags = [],
  selectedTagSlugs = [],
  onTagToggle,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedTags = tags.filter((tag) => selectedTagSlugs.includes(tag.slug));

  const filteredTags = tags.filter((tag) => {
    if (!searchTerm.trim()) return true;
    return tag.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelectTag = useCallback((tagSlug) => {
    onTagToggle(tagSlug);
  }, [onTagToggle]);

  const handleRemoveTag = useCallback((e, tagSlug) => {
    e.stopPropagation();
    onTagToggle(tagSlug);
  }, [onTagToggle]);

  const handleClearAll = useCallback((e) => {
    e.stopPropagation();
    onClearAll();
  }, [onClearAll]);

  const handleClickOutside = useCallback((e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="tag-filter-dropdown" ref={containerRef}>
      {/* Always-visible row: search input + chevron toggle button */}
      <div className="tag-filter-row">
        <div className="tag-filter-search-wrap">
          <Search size={14} className="tag-filter-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="tag-filter-search"
            placeholder="Tìm kiếm tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <button
          type="button"
          className={`tag-filter-toggle-btn ${isOpen ? 'open' : ''}`}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label="Toggle tag filter"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Selected tag badges — below the search row, only when tags are selected */}
      {selectedTags.length > 0 && (
        <div className="tag-filter-selected-area">
          {selectedTags.map((tag) => (
            <span key={tag.id} className="tag-filter-badge">
              {tag.name}
              <button
                type="button"
                className="tag-filter-badge-remove"
                onClick={(e) => handleRemoveTag(e, tag.slug)}
                aria-label={`Remove ${tag.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown list — only when open */}
      {isOpen && (
        <div className="tag-filter-body">
          {filteredTags.length === 0 ? (
            <p className="tag-filter-empty">Không tìm thấy tag nào.</p>
          ) : (
            <div className="tag-filter-list">
              {filteredTags.map((tag) => {
                const isSelected = selectedTagSlugs.includes(tag.slug);
                return (
                  <label
                    key={tag.id}
                    className={`tag-filter-option ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectTag(tag.slug)}
                    />
                    <span>{tag.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="tag-filter-footer">
              <button
                type="button"
                className="tag-filter-clear-all"
                onClick={handleClearAll}
              >
                Xóa tất cả tag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
