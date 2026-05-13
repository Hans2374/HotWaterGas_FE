import React from 'react';
import { ProductForm } from './ProductForm';
import './ProductModal.css';

export const ProductModal = ({ title, product, isOpen, isSubmitting, onClose, onSubmit }) => {
  if (!isOpen) {
    return null;
  }

  const mode = title === 'Edit Product' ? 'edit' : 'create';

  return (
    <div className="product-modal-overlay" onClick={onClose} role="presentation">
      <div className="product-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="product-modal-header">
          <h3 id="product-modal-title">{title}</h3>
          <button type="button" className="product-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <ProductForm
          mode={mode}
          initialData={product ?? {}}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};
