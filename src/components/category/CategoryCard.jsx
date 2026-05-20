import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CategoryCard.css';

export const CategoryCard = ({ category }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/products/search?category=${encodeURIComponent(category.slug)}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const hasImage = Boolean(category.imageUrl);

  return (
    <article
      className={`category-card${hasImage ? ' has-image' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`Danh mục ${category.name}`}
    >
      {hasImage && (
        <img
          className="category-card-image"
          src={category.imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      )}
      <div className="category-card-overlay" aria-hidden="true" />
      <div className="category-card-content">
        <h3 className="category-card-name">{category.name}</h3>
      </div>
    </article>
  );
};
