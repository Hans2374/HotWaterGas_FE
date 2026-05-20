import React, { useEffect, useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '../common/Button';
import { uploadCategoryImage } from '../../services/productService';
import './CategoryFormModal.css';

const createInitialData = (data) => ({
  name: '',
  slug: '',
  isActive: true,
  imageUrl: '',
  ...data
});

const createInitialErrors = () => ({
  name: ''
});

export const CategoryFormModal = ({
  mode,
  initialData,
  onSubmit,
  onClose,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState(createInitialData(initialData));
  const [errors, setErrors] = useState(createInitialErrors());
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setFormData(createInitialData(initialData));
    setErrors(createInitialErrors());
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageRemove = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setFileInputKey((k) => k + 1);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageUploadError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError('File size must be under 10 MB.');
      return;
    }

    setImageUploadError('');
    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadCategoryImage(file);
      if (!uploadedUrl) throw new Error('Upload returned an empty URL.');
      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
    } catch (err) {
      setImageUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
      setFileInputKey((k) => k + 1);
    }
  };

  const validate = () => {
    const nextErrors = createInitialErrors();
    if (!formData.name.trim()) {
      nextErrors.name = 'Category name is required.';
    }
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || null,
      isActive: formData.isActive,
      imageUrl: formData.imageUrl || null
    };

    onSubmit(payload);
  };

  const isEdit = mode === 'edit';
  const modalTitle = isEdit ? 'Edit Category' : 'Create Category';
  const modalSubtitle = isEdit
    ? 'Update category information.'
    : 'Add a new category for products.';
  const submitLabel = isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create';

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card category-form-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{modalTitle}</h3>
          <p className="modal-subtitle">{modalSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Image */}
            <div className="form-field-group">
              <label className="input-label">Category Image</label>
              {formData.imageUrl ? (
                <div className="category-image-preview">
                  <img src={formData.imageUrl} alt={formData.name || 'Category'} className="category-image-thumb" />
                  <button
                    type="button"
                    className="category-image-remove"
                    onClick={handleImageRemove}
                    title="Remove image"
                    disabled={isSubmitting}
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className={`category-image-upload-area ${isUploadingImage ? 'uploading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  aria-label="Upload category image"
                >
                  <input
                    key={fileInputKey}
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="file-input-hidden"
                    onChange={handleImageUpload}
                    disabled={isSubmitting || isUploadingImage}
                  />
                  {isUploadingImage ? (
                    <span className="category-image-upload-hint">Uploading...</span>
                  ) : (
                    <>
                      <Upload size={18} className="category-image-upload-icon" />
                      <span className="category-image-upload-hint">Click to upload (JPEG, PNG, WebP)</span>
                    </>
                  )}
                </div>
              )}
              {imageUploadError && <span className="input-error-message">{imageUploadError}</span>}
              <span className="input-hint">Optional — shown on the storefront</span>
            </div>

            <div className="form-field-group">
              <label htmlFor="category-name" className="input-label">
                Category Name
              </label>
              <input
                id="category-name"
                name="name"
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Action Games"
                disabled={isSubmitting}
                autoFocus
              />
              {errors.name && <span className="input-error-message">{errors.name}</span>}
            </div>

            <div className="form-field-group">
              <label htmlFor="category-slug" className="input-label">
                Slug <span className="input-optional">(optional)</span>
              </label>
              <input
                id="category-slug"
                name="slug"
                type="text"
                className="input"
                value={formData.slug}
                onChange={handleChange}
                placeholder="auto-generated if empty"
                disabled={isSubmitting}
              />
              <span className="input-hint">Leave empty to auto-generate from name</span>
            </div>

            <div className="form-field-group">
              <label className="input-checkbox-label">
                <input
                  name="isActive"
                  type="checkbox"
                  className="input-checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span className="checkbox-text">Active</span>
              </label>
              <span className="input-hint">Inactive categories are hidden from the storefront</span>
            </div>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
