import React, { useEffect, useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { getCategories } from '../../services/productService';
import './AdminProductFilter.css';

export const AdminProductFilter = ({
  search = '',
  status = '',
  stockState = '',
  categoryId = '',
  onFilterChange
}) => {
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const result = await getCategories();
        setCategories(result || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      onFilterChange({ search: value });
    }, 300);

    setDebounceTimer(timer);
  };

  const handleStatusChange = (e) => {
    onFilterChange({ status: e.target.value });
  };

  const handleStockStateChange = (e) => {
    onFilterChange({ stockState: e.target.value });
  };

  const handleCategoryChange = (e) => {
    onFilterChange({ categoryId: e.target.value });
  };

  const handleReset = () => {
    setLocalSearch('');
    onFilterChange({
      search: '',
      status: '',
      stockState: '',
      categoryId: ''
    });
  };

  return (
    <div className="admin-filter-toolbar">
      {/* Search input - takes most space on left */}
      <div className="admin-filter-search-wrap">
        <Input
          type="text"
          placeholder="Search name, developer, publisher..."
          value={localSearch}
          onChange={handleSearchChange}
        />
      </div>

      {/* Compact filters and actions on right */}
      <div className="admin-filter-controls">
        <div className="admin-filter-group">
          <select
            value={status}
            onChange={handleStatusChange}
            className="admin-filter-select"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <select
            value={stockState}
            onChange={handleStockStateChange}
            className="admin-filter-select"
          >
            <option value="">All Stock</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <select
            value={categoryId}
            onChange={handleCategoryChange}
            className="admin-filter-select"
            disabled={isLoadingCategories}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-actions">
          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
