import React from 'react';
import './ReviewCard.css';

export const ReviewCard = ({ review }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-user-info">
          <span className="review-card-username">{review.userDisplayName}</span>
          {review.isMine && <span className="review-card-badge">Your Review</span>}
        </div>
        <span className="review-card-date">
          {formatDate(review.createdAt)}
          {review.isEdited && <span className="review-card-edited"> (Edited)</span>}
        </span>
      </div>
      
      <div className="review-card-rating">
        <span className="review-stars">{renderStars(review.rating)}</span>
        <span className="review-rating-value">{review.rating}/5</span>
      </div>
      
      <p className="review-card-comment">{review.comment}</p>
    </div>
  );
};
