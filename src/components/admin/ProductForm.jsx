import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { getCategories, getTags, uploadProductImage } from '../../services/productService';
import './ProductForm.css';

const createInitialErrors = () => ({
  name: '',
  description: '',
  shortDescription: '',
  price: '',
  publisher: '',
  developer: '',
  platform: '',
  images: '',
  categoryId: '',
  discountPercentage: ''
});

const createEmptyRequirementSpec = () => ({
  os: '',
  processor: '',
  memory: '',
  graphics: '',
  storage: '',
  notes: ''
});

const normalizeRequirementSpec = (spec) => {
  const fallback = createEmptyRequirementSpec();
  return {
    os: spec?.os ?? fallback.os,
    processor: spec?.processor ?? fallback.processor,
    memory: spec?.memory ?? fallback.memory,
    graphics: spec?.graphics ?? fallback.graphics,
    storage: spec?.storage ?? fallback.storage,
    notes: spec?.notes ?? fallback.notes
  };
};

const normalizeImageEntry = (image) => {
  if (typeof image === 'string') return { id: null, url: image };
  return {
    id: image?.id ?? image?.Id ?? null,
    url: image?.url ?? image?.Url ?? image?.imageUrl ?? image?.ImageUrl ?? ''
  };
};

const normalizeImageEntries = (images = [], fallbackUrls = []) => {
  const source = Array.isArray(images) && images.length > 0 ? images : fallbackUrls;
  return source
    .map(normalizeImageEntry)
    .map((image) => ({
      id: image.id || null,
      url: typeof image.url === 'string' ? image.url : ''
    }))
    .filter((image) => image.url.trim().length > 0);
};

const createInitialData = (initialData) => ({
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  price: '',
  discountPercentage: '',
  publisher: '',
  developer: '',
  releaseDate: '',
  platform: '',
  images: [],
  categoryId: '',
  tagIds: [],
  systemRequirements: {
    minimum: createEmptyRequirementSpec(),
    recommended: createEmptyRequirementSpec()
  },
  ...initialData,
  images: normalizeImageEntries(initialData?.images, initialData?.imageUrls),
  systemRequirements: {
    minimum: normalizeRequirementSpec(initialData?.systemRequirements?.minimum),
    recommended: normalizeRequirementSpec(initialData?.systemRequirements?.recommended)
  }
});

const normalizeTagIds = (ids) => (Array.isArray(ids) ? ids.filter(Boolean) : []);

export const ProductForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState(createInitialData(initialData));
  const [errors, setErrors] = useState(createInitialErrors());
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLookupLoading, setIsLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const fileInputRef = useRef(null);

  const discountPercentage = Number(formData.discountPercentage || 0);

  const pricePreview = useMemo(() => {
    const basePrice = Number(formData.price || 0);
    if (!basePrice || Number.isNaN(basePrice)) return 0;
    const pct = discountPercentage;
    if (!pct || Number.isNaN(pct) || pct <= 0) return basePrice;
    return Math.max(0, basePrice - (basePrice * pct / 100));
  }, [formData.price, discountPercentage]);

  const discountSavings = useMemo(() => {
    const base = Number(formData.price || 0);
    if (!base || Number.isNaN(base)) return 0;
    return base - pricePreview;
  }, [formData.price, pricePreview]);

  useEffect(() => {
    setFormData(createInitialData(initialData));
    setErrors(createInitialErrors());
    setSelectedFile(null);
    setImageUploadError('');
    setFileInputKey((prev) => prev + 1);
  }, [initialData]);

  useEffect(() => {
    const loadLookups = async () => {
      setIsLookupLoading(true);
      setLookupError('');
      try {
        const [categoryResult, tagResult] = await Promise.all([
          getCategories(),
          getTags()
        ]);
        setCategories(categoryResult || []);
        setTags(tagResult || []);
      } catch (apiError) {
        setLookupError(apiError.message || 'Failed to load form data.');
      } finally {
        setIsLookupLoading(false);
      }
    };
    loadLookups();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCategoryChange = (event) => {
    setFormData((prev) => ({ ...prev, categoryId: event.target.value }));
    setErrors((prev) => ({ ...prev, categoryId: '' }));
  };

  const handleToggleTag = (tagId) => {
    setFormData((prev) => {
      const current = normalizeTagIds(prev.tagIds);
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      return { ...prev, tagIds: next };
    });
  };

  const handleSystemRequirementChange = (tier, field, value) => {
    setFormData((prev) => ({
      ...prev,
      systemRequirements: {
        ...prev.systemRequirements,
        [tier]: { ...prev.systemRequirements[tier], [field]: value }
      }
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setImageUploadError('');
    if (file) handleUploadSelectedImage(file);
  };

  const handleUploadSelectedImage = async (fileParam) => {
    const fileToUpload = fileParam || selectedFile;
    if (!fileToUpload) {
      setImageUploadError('Select an image file first.');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError('');
    try {
      const uploadedUrl = await uploadProductImage(fileToUpload);
      if (!uploadedUrl) throw new Error('Upload returned an empty URL.');
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, { id: null, url: uploadedUrl }]
      }));
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
    } catch (apiError) {
      setImageUploadError(apiError.message || 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validate = () => {
    const nextErrors = createInitialErrors();
    if (!formData.name.trim()) nextErrors.name = 'Name is required.';
    if (!formData.description.trim()) nextErrors.description = 'Description is required.';
    if (!formData.shortDescription.trim()) nextErrors.shortDescription = 'Short description is required.';

    const priceValue = Number(formData.price);
    if (formData.price === '' || Number.isNaN(priceValue)) {
      nextErrors.price = 'Price is required.';
    } else if (priceValue < 0) {
      nextErrors.price = 'Price must be 0 or greater.';
    }

    const discountPct = Number(formData.discountPercentage);
    if (formData.discountPercentage !== '' && !Number.isNaN(discountPct)) {
      if (discountPct < 0) {
        nextErrors.discountPercentage = 'Discount cannot be negative.';
      } else if (discountPct > 100) {
        nextErrors.discountPercentage = 'Discount cannot exceed 100%.';
      }
    }

    if (!formData.publisher.trim()) nextErrors.publisher = 'Publisher is required.';
    if (!formData.developer.trim()) nextErrors.developer = 'Developer is required.';
    if (!formData.platform.trim()) nextErrors.platform = 'Platform is required.';

    const normalizedImageUrls = formData.images.map((item) => item.url.trim()).filter(Boolean);
    if (normalizedImageUrls.length === 0) nextErrors.images = 'At least one image is required.';
    if (!formData.categoryId) nextErrors.categoryId = 'Please select a category.';

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const tagIds = normalizeTagIds(formData.tagIds);
    const discountPct = Number(formData.discountPercentage);
    const finalDiscountPercentage = formData.discountPercentage !== '' && !Number.isNaN(discountPct) && discountPct > 0
      ? discountPct
      : null;

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || null,
      description: formData.description.trim(),
      shortDescription: formData.shortDescription.trim(),
      price: Number(formData.price),
      discountPercentage: finalDiscountPercentage,
      images: formData.images.map((item) => ({ id: item.id || null, url: item.url.trim() })).filter((item) => item.url),
      imageUrls: formData.images.map((item) => item.url.trim()).filter(Boolean),
      categoryId: formData.categoryId || null,
      tagIds,
      metadata: {
        publisher: formData.publisher.trim(),
        developer: formData.developer.trim(),
        releaseDate: formData.releaseDate || null,
        platform: formData.platform.trim()
      },
      systemRequirements: {
        minimum: {
          os: formData.systemRequirements.minimum.os.trim(),
          processor: formData.systemRequirements.minimum.processor.trim(),
          memory: formData.systemRequirements.minimum.memory.trim(),
          graphics: formData.systemRequirements.minimum.graphics.trim(),
          storage: formData.systemRequirements.minimum.storage.trim(),
          notes: formData.systemRequirements.minimum.notes.trim()
        },
        recommended: {
          os: formData.systemRequirements.recommended.os.trim(),
          processor: formData.systemRequirements.recommended.processor.trim(),
          memory: formData.systemRequirements.recommended.memory.trim(),
          graphics: formData.systemRequirements.recommended.graphics.trim(),
          storage: formData.systemRequirements.recommended.storage.trim(),
          notes: formData.systemRequirements.recommended.notes.trim()
        }
      }
    };
    await onSubmit(payload);
  };

  if (isLookupLoading) {
    return <p className="product-form-message">Loading form data...</p>;
  }
  if (lookupError) {
    return <p className="product-form-message error">{lookupError}</p>;
  }

  const hasActiveDiscount = discountPercentage > 0;
  const showPricingPreview = Number(formData.price) > 0;

  return (
    <form className="product-form" onSubmit={handleSubmit}>

      {/* Basic Information */}
      <section className="form-card">
        <h3 className="form-card-title">Basic Information</h3>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-name">Product Name</label>
            <input
              id="field-name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              disabled={isSubmitting}
            />
            {errors.name && <span className="input-error-message">{errors.name}</span>}
          </div>

          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-slug">Slug <span style={{ fontWeight: 400, color: 'var(--cat-text-muted)' }}>(optional)</span></label>
            <input
              id="field-slug"
              className="form-input"
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="auto-generated-from-name"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-short-desc">Short Description</label>
            <textarea
              id="field-short-desc"
              className={`form-textarea ${errors.shortDescription ? 'error' : ''}`}
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              rows={2}
              placeholder="Brief summary for listing cards"
              disabled={isSubmitting}
            />
            {errors.shortDescription && <span className="input-error-message">{errors.shortDescription}</span>}
          </div>

          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-desc">Full Description</label>
            <textarea
              id="field-desc"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Complete product description"
              disabled={isSubmitting}
            />
            {errors.description && <span className="input-error-message">{errors.description}</span>}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="form-card">
        <h3 className="form-card-title">Pricing</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-price">Base Price</label>
            <input
              id="field-price"
              className={`form-input ${errors.price ? 'error' : ''}`}
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.price && <span className="input-error-message">{errors.price}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-discount">Discount Percentage (%)</label>
            <input
              id="field-discount"
              className={`form-input ${errors.discountPercentage ? 'error' : ''}`}
              type="number"
              name="discountPercentage"
              value={formData.discountPercentage}
              onChange={handleChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.01"
              disabled={isSubmitting}
            />
            <span className="input-hint">Enter 0 or leave blank for no discount.</span>
            {errors.discountPercentage && <span className="input-error-message">{errors.discountPercentage}</span>}
          </div>
        </div>

        {/* Pricing Preview */}
        {showPricingPreview && (
          <div className="pricing-preview">
            <div className="pricing-preview-row">
              <span className="pricing-preview-label">Original Price</span>
              <span className="pricing-preview-value pricing-original">
                {Number(formData.price || 0).toLocaleString()}
              </span>
            </div>
            {hasActiveDiscount && (
              <div className="pricing-preview-row">
                <span className="pricing-preview-label">Discount</span>
                <span className="pricing-preview-value pricing-discount">
                  -{discountPercentage}%
                </span>
              </div>
            )}
            <div className="pricing-preview-divider" />
            <div className="pricing-preview-row">
              <span className="pricing-preview-label">Final Price</span>
              <span className={`pricing-preview-value pricing-final ${hasActiveDiscount ? 'has-discount' : ''}`}>
                {pricePreview.toLocaleString()}
              </span>
            </div>
            {hasActiveDiscount && discountSavings > 0 && (
              <p className="pricing-preview-savings">
                Customers save {discountSavings.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Images */}
      <section className="form-card">
        <h3 className="form-card-title">Images</h3>
        <div className="image-upload-area">
          <input
            ref={fileInputRef}
            id="product-image-file-input"
            key={fileInputKey}
            className="file-input-hidden"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isSubmitting || isUploadingImage}
          />
          <div className="image-grid">
            <div
              className={`image-tile add-tile ${isUploadingImage ? 'uploading' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isSubmitting || isUploadingImage) return;
                fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Add image"
            >
              {isUploadingImage ? (
                <div className="tile-spinner" />
              ) : (
                <Plus size={22} className="add-icon" />
              )}
            </div>
            {formData.images.map((image, index) => (
              <div className="image-tile" key={`img-${image.id || index}`}>
                <img src={image.url} alt={`Image ${index + 1}`} />
                {index === 0 && <span className="tile-badge">Primary</span>}
                <button
                  type="button"
                  className="tile-remove"
                  onClick={() => handleRemoveImage(index)}
                  disabled={isSubmitting || isUploadingImage}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {imageUploadError && <span className="input-error-message">{imageUploadError}</span>}
          {errors.images && <span className="input-error-message">{errors.images}</span>}
          <p className="upload-hint">First image becomes the primary listing image.</p>
        </div>
      </section>

      {/* Category & Tags */}
      <section className="form-card">
        <h3 className="form-card-title">Organization</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-category">Category</label>
            <div className="form-select-wrap">
              <select
                id="field-category"
                className={`form-select ${errors.categoryId ? 'error' : ''}`}
                name="categoryId"
                value={formData.categoryId}
                onChange={handleCategoryChange}
                disabled={isSubmitting || isLookupLoading}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            {errors.categoryId && <span className="input-error-message">{errors.categoryId}</span>}
          </div>

          <div className="form-field form-field-full">
            <label className="input-label">Tags <span style={{ fontWeight: 400, color: 'var(--cat-text-muted)' }}>(optional)</span></label>
            <div className="tags-grid">
              {tags.map((tag) => {
                const checked = normalizeTagIds(formData.tagIds).includes(tag.id);
                return (
                  <label
                    className={`tag-checkbox ${checked ? 'checked' : ''}`}
                    key={tag.id}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleTag(tag.id)}
                      disabled={isSubmitting}
                    />
                    {tag.name}
                  </label>
                );
              })}
              {tags.length === 0 && (
                <span className="input-hint">No tags available.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="form-card">
        <h3 className="form-card-title">Product Details</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-publisher">Publisher</label>
            <input
              id="field-publisher"
              className={`form-input ${errors.publisher ? 'error' : ''}`}
              type="text"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              placeholder="Publisher name"
              disabled={isSubmitting}
            />
            {errors.publisher && <span className="input-error-message">{errors.publisher}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-developer">Developer</label>
            <input
              id="field-developer"
              className={`form-input ${errors.developer ? 'error' : ''}`}
              type="text"
              name="developer"
              value={formData.developer}
              onChange={handleChange}
              placeholder="Developer name"
              disabled={isSubmitting}
            />
            {errors.developer && <span className="input-error-message">{errors.developer}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-release-date">Release Date <span style={{ fontWeight: 400, color: 'var(--cat-text-muted)' }}>(optional)</span></label>
            <input
              id="field-release-date"
              className="form-input"
              type="date"
              name="releaseDate"
              value={formData.releaseDate}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-platform">Platform</label>
            <input
              id="field-platform"
              className={`form-input ${errors.platform ? 'error' : ''}`}
              type="text"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              placeholder="Windows, macOS, Linux"
              disabled={isSubmitting}
            />
            {errors.platform && <span className="input-error-message">{errors.platform}</span>}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="form-card">
        <h3 className="form-card-title">System Requirements</h3>
        <div className="requirements-grid">
          <div className="req-card">
            <h4 className="req-card-title">Minimum</h4>
            <div className="form-grid">
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-os">OS</label>
                <input id="req-min-os" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.os}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'os', e.target.value)}
                  placeholder="Windows 10 64-bit" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-proc">Processor</label>
                <input id="req-min-proc" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.processor}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'processor', e.target.value)}
                  placeholder="Intel Core i5-4460" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-mem">Memory</label>
                <input id="req-min-mem" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.memory}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'memory', e.target.value)}
                  placeholder="8 GB RAM" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-gfx">Graphics</label>
                <input id="req-min-gfx" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.graphics}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'graphics', e.target.value)}
                  placeholder="NVIDIA GTX 960" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-sto">Storage</label>
                <input id="req-min-sto" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.storage}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'storage', e.target.value)}
                  placeholder="50 GB" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field form-field-full">
                <label className="input-label" htmlFor="req-min-notes">Notes <span style={{ fontWeight: 400, color: 'var(--cat-text-muted)' }}>(optional)</span></label>
                <textarea id="req-min-notes" className="form-textarea"
                  value={formData.systemRequirements.minimum.notes}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'notes', e.target.value)}
                  rows={2} maxLength={500} placeholder="Additional notes"
                  disabled={isSubmitting} />
              </div>
            </div>
          </div>

          <div className="req-card">
            <h4 className="req-card-title">Recommended</h4>
            <div className="form-grid">
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-os">OS</label>
                <input id="req-rec-os" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.os}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'os', e.target.value)}
                  placeholder="Windows 11 64-bit" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-proc">Processor</label>
                <input id="req-rec-proc" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.processor}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'processor', e.target.value)}
                  placeholder="Intel Core i7-9700K" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-mem">Memory</label>
                <input id="req-rec-mem" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.memory}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'memory', e.target.value)}
                  placeholder="16 GB RAM" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-gfx">Graphics</label>
                <input id="req-rec-gfx" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.graphics}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'graphics', e.target.value)}
                  placeholder="NVIDIA RTX 3060" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-sto">Storage</label>
                <input id="req-rec-sto" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.storage}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'storage', e.target.value)}
                  placeholder="60 GB SSD" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field form-field-full">
                <label className="input-label" htmlFor="req-rec-notes">Notes <span style={{ fontWeight: 400, color: 'var(--cat-text-muted)' }}>(optional)</span></label>
                <textarea id="req-rec-notes" className="form-textarea"
                  value={formData.systemRequirements.recommended.notes}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'notes', e.target.value)}
                  rows={2} maxLength={500} placeholder="Additional notes"
                  disabled={isSubmitting} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting || isUploadingImage}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || isUploadingImage}
        >
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};
