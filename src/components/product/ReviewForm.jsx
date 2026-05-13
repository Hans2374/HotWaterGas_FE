import React, { useEffect, useState } from 'react';
import './ReviewForm.css';

export const ReviewForm = ({ existingReview, onSubmit, onCancel, isLoading }) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    }
  }, [existingReview]);

  const validateForm = () => {
    const newErrors = {};

    if (rating < 1 || rating > 5) {
      newErrors.rating = 'Vui lòng chọn đánh giá từ 1 đến 5 sao';
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      newErrors.comment = 'Bình luận không thể trống';
    } else if (trimmedComment.length < 10) {
      newErrors.comment = 'Bình luận phải ít nhất 10 ký tự';
    } else if (trimmedComment.length > 1000) {
      newErrors.comment = 'Bình luận không được vượt quá 1000 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        rating,
        comment: comment.trim()
      });
    }
  };

  const renderRatingStars = () => {
    return (
      <div className="review-form-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`review-form-star ${star <= (hoverRating || rating) ? 'active' : ''}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            ★
          </button>
        ))}
        {rating > 0 && <span className="review-form-rating-label">{rating}/5</span>}
      </div>
    );
  };

  const isFormValid = rating >= 1 && rating <= 5 && comment.trim().length >= 10 && comment.trim().length <= 1000;

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <h3 className="review-form-title">
        {existingReview ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}
      </h3>

      <div className="review-form-group">
        <label className="review-form-label">Đánh giá của bạn *</label>
        {renderRatingStars()}
        {errors.rating && <span className="review-form-error">{errors.rating}</span>}
      </div>

      <div className="review-form-group">
        <label className="review-form-label">Bình luận *</label>
        <textarea
          className={`review-form-textarea ${errors.comment ? 'error' : ''}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          rows={6}
          disabled={isLoading}
        />
        <div className="review-form-textarea-footer">
          <span className={`review-form-char-count ${comment.length > 1000 ? 'error' : ''}`}>
            {comment.length}/1000
          </span>
        </div>
        {errors.comment && <span className="review-form-error">{errors.comment}</span>}
      </div>

      <div className="review-form-actions">
        <button
          type="button"
          className="review-form-btn cancel"
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="review-form-btn submit"
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Đang xử lý...' : existingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
        </button>
      </div>
    </form>
  );
};
