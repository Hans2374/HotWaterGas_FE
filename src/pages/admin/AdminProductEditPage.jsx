import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProductForm } from '../../components/admin/ProductForm';
import { SteamKeySummaryMetrics } from '../../components/admin/SteamKeySummaryMetrics';
import {
  getAdminProductDetail,
  getAdminSteamKeySummary,
  updateAdminProduct
} from '../../services/productService';
import './AdminProductFormPage.css';

export const AdminProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [steamKeySummary, setSteamKeySummary] = useState({
    available: 0,
    disabled: 0,
    sold: 0,
    total: 0
  });
  const [isSteamKeySummaryLoading, setIsSteamKeySummaryLoading] = useState(true);
  const [steamKeySummaryError, setSteamKeySummaryError] = useState('');

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admin/products');
    }
  };

  const initialData = useMemo(() => {
    if (!product) return null;
    return {
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      shortDescription: product?.shortDescription || '',
      price: product?.price ?? '',
      discountPercentage: product?.discountPercentage != null ? String(product.discountPercentage) : '',
      publisher: product?.metadata?.publisher || '',
      developer: product?.metadata?.developer || '',
      releaseDate: product?.metadata?.releaseDate ? String(product.metadata.releaseDate).slice(0, 10) : '',
      platform: product?.metadata?.platform || '',
      systemRequirements: {
        minimum: {
          os: product?.systemRequirements?.minimum?.os || product?.systemRequirement?.minimumOS || '',
          processor: product?.systemRequirements?.minimum?.processor || product?.systemRequirement?.minimumProcessor || '',
          memory: product?.systemRequirements?.minimum?.memory || product?.systemRequirement?.minimumMemory || '',
          graphics: product?.systemRequirements?.minimum?.graphics || product?.systemRequirement?.minimumGraphics || '',
          storage: product?.systemRequirements?.minimum?.storage || product?.systemRequirement?.minimumStorage || '',
          notes: product?.systemRequirements?.minimum?.notes || product?.systemRequirement?.minimumNotes || ''
        },
        recommended: {
          os: product?.systemRequirements?.recommended?.os || product?.systemRequirement?.recommendedOS || '',
          processor: product?.systemRequirements?.recommended?.processor || product?.systemRequirement?.recommendedProcessor || '',
          memory: product?.systemRequirements?.recommended?.memory || product?.systemRequirement?.recommendedMemory || '',
          graphics: product?.systemRequirements?.recommended?.graphics || product?.systemRequirement?.recommendedGraphics || '',
          storage: product?.systemRequirements?.recommended?.storage || product?.systemRequirement?.recommendedStorage || '',
          notes: product?.systemRequirements?.recommended?.notes || product?.systemRequirement?.recommendedNotes || ''
        }
      },
      images: Array.isArray(product?.images)
        ? product.images
            .map((image) => ({
              id: image?.id ?? image?.Id ?? null,
              url: image?.url ?? image?.Url ?? ''
            }))
            .filter((image) => image.url)
        : Array.isArray(product?.imageUrls)
          ? product.imageUrls.filter(Boolean).map((url) => ({ id: null, url }))
          : [],
      categoryId: Array.isArray(product?.categories) && product.categories.length > 0
        ? product.categories[0].id
        : '',
      tagIds: Array.isArray(product?.tags) ? product.tags.map((item) => item.id) : []
    };
  }, [product]);

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await getAdminProductDetail(id);
        setProduct(result);
      } catch (apiError) {
        if (apiError.status === 404) {
          setError('Product not found.');
        } else {
          setError(apiError.message || 'Failed to load product detail.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadSteamKeySummary = async () => {
      setIsSteamKeySummaryLoading(true);
      setSteamKeySummaryError('');

      try {
        const result = await getAdminSteamKeySummary(id);
        setSteamKeySummary(result);
      } catch (apiError) {
        setSteamKeySummaryError(apiError.message || 'Failed to load Steam key summary.');
      } finally {
        setIsSteamKeySummaryLoading(false);
      }
    };

    loadSteamKeySummary();
  }, [id]);

  const handleSubmit = async (payload) => {
    setIsSaving(true);

    try {
      await updateAdminProduct(id, payload);
      toast.success('Product updated successfully.');
      navigate('/admin/products');
    } catch (apiError) {
      toast.error(apiError.message || 'Failed to update product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-form-shell">
        <div className="admin-form-header">
        <div className="admin-form-header-row">
          <button type="button" className="back-button" onClick={handleGoBack}>
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
        <h2 className="admin-form-title">Edit Product</h2>
        <p className="admin-form-subtitle">Update product details, metadata, and related catalog data.</p>
      </div>

      {isLoading && <p className="product-form-message">Loading product detail...</p>}

      {!isLoading && error && (
        <div className="admin-form-feedback error">{error}</div>
      )}

        {!isLoading && !error && (
          <div className="steam-key-card">
            <div className="steam-key-card-row">
              <div className="steam-key-card-info">
                <h3 className="steam-key-card-title">Steam Keys</h3>
                <p className="steam-key-card-subtitle">Fulfillment inventory for this product</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/admin/products/${id}/keys`)}
              >
                Manage Keys
              </button>
            </div>
            <SteamKeySummaryMetrics
              summary={steamKeySummary}
              isLoading={isSteamKeySummaryLoading}
            />
          </div>
        )}

        {!isLoading && !error && (
          <ProductForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleGoBack}
            isSubmitting={isSaving}
          />
        )}
      </div>
  );
};
