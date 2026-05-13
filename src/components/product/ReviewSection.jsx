import React, { useEffect, useState } from 'react';
import { ReviewSummary } from './ReviewSummary';
import { ReviewForm } from './ReviewForm';
import { ReviewCard } from './ReviewCard';
import reviewApi from '../../api/reviewApi';
import { useAuth } from '../../hooks/useAuth';
import { Loader } from '../common/Loader';
import './ReviewSection.css';

export const ReviewSection = ({ productId, onRatingUpdate }) => {
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!productId) {
      // nothing to load yet
      setLoading(false);
      return;
    }

    fetchReviews(1);
  }, [productId]);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await reviewApi.getProductReviews(productId, page, 5);
      setReviews(response.data);
      
      // Find user's review if authenticated
      if (token && response.data.reviews) {
        const myReview = response.data.reviews.find(r => r.isMine);
        setUserReview(myReview || null);
      }

      setCurrentPage(page);
      if (onRatingUpdate) {
        onRatingUpdate(response.data.averageRating, response.data.totalReviews);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải đánh giá');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReview = () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setShowForm(!showForm);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setSubmitLoading(true);
      setError('');

      if (userReview) {
        // Update existing review
        await reviewApi.updateMyReview(productId, formData.rating, formData.comment);
      } else {
        // Create new review
        await reviewApi.createReview(productId, formData.rating, formData.comment);
      }

      setShowForm(false);
      await fetchReviews(1);
    } catch (err) {
      const message = err.response?.data?.message || 'Lỗi khi lưu đánh giá';
      setError(message);
      console.error('Error submitting review:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
  };

  const handlePageChange = (newPage) => {
    fetchReviews(newPage);
  };

  if (loading) {
    return (
      <section className="review-section">
        <h2 className="review-section-title">Đánh giá & Bình luận</h2>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '200px' }}>
          <Loader text="Đang tải đánh giá..." />
        </div>
      </section>
    );
  }

  // Use a safe fallback so the section still renders even if fetch failed
  const safeReviews = reviews || { averageRating: 0, totalReviews: 0, reviews: [], totalPages: 0 };

  return (
    <section className="review-section">
      <h2 className="review-section-title">Đánh giá & Bình luận</h2>

      {error && (
        <div className="review-section-error">
          {error}
        </div>
      )}

      <ReviewSummary
        averageRating={safeReviews.averageRating}
        totalReviews={safeReviews.totalReviews}
        onWriteReview={handleWriteReview}
        hasReviewed={!!userReview}
        isLoading={submitLoading}
        isAuthenticated={!!token}
      />

      {showForm && (
        <ReviewForm
          existingReview={userReview}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          isLoading={submitLoading}
        />
      )}

      {safeReviews.reviews && safeReviews.reviews.length > 0 ? (
        <div className="review-list">
          <h3 className="review-list-title">
            {safeReviews.totalReviews} đánh giá
          </h3>
          
          {safeReviews.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

          {safeReviews.totalPages > 1 && (
            <div className="review-pagination">
              {currentPage > 1 && (
                <button
                  className="review-pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  ← Trước
                </button>
              )}
              
              <span className="review-pagination-info">
                Trang {currentPage} / {safeReviews.totalPages}
              </span>

              {currentPage < safeReviews.totalPages && (
                <button
                  className="review-pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Tiếp →
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="review-section-empty">
          <p>Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
        </div>
      )}
    </section>
  );
};
