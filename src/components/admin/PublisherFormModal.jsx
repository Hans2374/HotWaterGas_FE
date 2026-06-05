import React, { useEffect, useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '../common/Button';
import { uploadCategoryImage } from '../../services/productService';
import './PublisherFormModal.css';

const createInitialData = (data) => ({
  name: '',
  slug: '',
  description: '',
  logoUrl: '',
  ...data
});

const createInitialErrors = () => ({
  name: ''
});

export const PublisherFormModal = ({
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageRemove = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
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
      setFormData((prev) => ({ ...prev, logoUrl: uploadedUrl }));
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
      nextErrors.name = 'Publisher name is required.';
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
      description: formData.description.trim() || null,
      logoUrl: formData.logoUrl || null
    };

    onSubmit(payload);
  };

  const isEdit = mode === 'edit';
  const modalTitle = isEdit ? 'Edit Publisher' : 'Create Publisher';
  const modalSubtitle = isEdit ? 'Update publisher information.' : 'Add a new publisher.';
  const submitLabel = isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create';

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card publisher-form-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{modalTitle}</h3>
          <p className="modal-subtitle">{modalSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Logo */}
            <div className="form-field-group">
              <label className="input-label">Logo</label>
              {formData.logoUrl ? (
                <div className="publisher-image-preview">
                  <img
                    src={formData.logoUrl}
                    alt={formData.name || 'Publisher'}
                    className="publisher-image-thumb"
                  />
                  <button
                    type="button"
                    className="publisher-image-remove"
                    onClick={handleImageRemove}
                    title="Remove image"
                    disabled={isSubmitting}
                    aria-label="Remove logo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className={`publisher-image-upload-area ${isUploadingImage ? 'uploading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                  aria-label="Upload publisher logo"
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
                    <span className="publisher-image-upload-hint">Uploading...</span>
                  ) : (
                    <>
                      <Upload size={18} className="publisher-image-upload-icon" />
                      <span className="publisher-image-upload-hint">
                        Click to upload (JPEG, PNG, WebP)
                      </span>
                    </>
                  )}
                </div>
              )}
              {imageUploadError && (
                <span className="input-error-message">{imageUploadError}</span>
              )}
              <span className="input-hint">Optional</span>
            </div>

            {/* Name */}
            <div className="form-field-group">
              <label htmlFor="publisher-name" className="input-label">
                Publisher Name
              </label>
              <input
                id="publisher-name"
                name="name"
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Valve"
                disabled={isSubmitting}
                autoFocus
              />
              {errors.name && (
                <span className="input-error-message">{errors.name}</span>
              )}
            </div>

            {/* Slug */}
            <div className="form-field-group">
              <label htmlFor="publisher-slug" className="input-label">
                Slug <span className="input-optional">(optional)</span>
              </label>
              <input
                id="publisher-slug"
                name="slug"
                type="text"
                className="input"
                value={formData.slug}
                onChange={handleChange}
                placeholder="auto-generated if empty"
                disabled={isSubmitting}
              />
              <span className="input-hint">
                Leave empty to auto-generate from name
              </span>
            </div>

            {/* Description */}
            <div className="form-field-group">
              <label htmlFor="publisher-description" className="input-label">
                Description <span className="input-optional">(optional)</span>
              </label>
              <textarea
                id="publisher-description"
                name="description"
                className="input textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Short description of the publisher..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
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
