import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import './CategoryFormModal.css';

const createInitialData = (data) => ({
  name: '',
  slug: '',
  isActive: true,
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
      isActive: formData.isActive
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
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
