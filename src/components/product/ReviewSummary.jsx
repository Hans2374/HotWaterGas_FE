import React from 'react';
import './ReviewSummary.css';

export const ReviewSummary = ({ averageRating, totalReviews, onWriteReview, hasReviewed, isLoading, isAuthenticated }) => {
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <span className="review-summary-stars">
        {'★'.repeat(fullStars)}
        {hasHalf && '☆'.repeat(1)}
        {'☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0))}
      </span>
    );
  };

  return (
    <div className="review-summary">
      <div className="review-summary-stats">
        <div className="review-summary-rating">
          <div className="review-summary-rating-value">{averageRating.toFixed(1)}</div>
          <div className="review-summary-rating-sub">/5</div>
        </div>
        <div className="review-summary-details">
          {renderStars(averageRating)}
          <div className="review-summary-count">{totalReviews} {totalReviews === 1 ? 'đánh giá' : 'đánh giá'}</div>
        </div>
      </div>

      <div className="review-summary-cta">
        {!isAuthenticated ? (
          <button className="review-summary-btn disabled" disabled>
            Đăng nhập để đánh giá
          </button>
        ) : hasReviewed ? (
          <button
            className="review-summary-btn edit"
            onClick={onWriteReview}
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : 'Chỉnh sửa đánh giá'}
          </button>
        ) : (
          <button
            className="review-summary-btn"
            onClick={onWriteReview}
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : 'Viết đánh giá'}
          </button>
        )}
      </div>
    </div>
  );
};
