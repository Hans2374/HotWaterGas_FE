import React, { useEffect, useState } from 'react';
import { getCategories } from '../../api/categoriesApi';
import { CategoryGrid } from '../../components/category/CategoryGrid';
import { Loader } from '../../components/common/Loader';
import './CategoryPage.css';

export const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await getCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (apiError) {
        setError(apiError.message || 'Không thể tải danh mục.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="category-page">
      <div className="category-page-header">
        <h1 className="category-page-title">Danh Mục Game</h1>
        <p className="category-page-subtitle">
          Khám phá game theo thể loại yêu thích của bạn
        </p>
      </div>

      {isLoading && <Loader text="Đang tải danh mục..." />}

      {error && <p className="category-page-error">{error}</p>}

      {!isLoading && !error && categories.length === 0 && (
        <p className="category-page-empty">Không có danh mục nào.</p>
      )}

      {!isLoading && !error && categories.length > 0 && (
        <CategoryGrid categories={categories} />
      )}
    </div>
  );
};
