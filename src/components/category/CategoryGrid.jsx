import React from 'react';
import { CategoryCard } from './CategoryCard';
import './CategoryGrid.css';

export const CategoryGrid = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="category-grid">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
};
