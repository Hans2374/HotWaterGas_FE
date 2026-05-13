import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '../../components/admin/ProductForm';
import { createAdminProduct } from '../../services/productService';
import { toast } from 'sonner';
import './AdminProductFormPage.css';

export const AdminProductCreatePage = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admin/products');
    }
  };

  const handleSubmit = async (payload) => {
    setIsSaving(true);

    try {
      await createAdminProduct(payload);
      toast.success('Product created successfully.');
      navigate('/admin/products');
    } catch (apiError) {
      toast.error(apiError.message || 'Failed to create product.');
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
        <h2 className="admin-form-title">Create Product</h2>
        <p className="admin-form-subtitle">Fill in core details, metadata, images, and organization.</p>
      </div>

      <ProductForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleGoBack}
        isSubmitting={isSaving}
      />
    </div>
  );
};
