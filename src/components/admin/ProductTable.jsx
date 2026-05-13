import React from 'react';
import { Button } from '../common/Button';
import './ProductTable.css';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

const renderPriceCell = (product) => {
  const basePrice = Number(product.price || 0);
  const discountPrice = Number(product.discountPrice ?? product.finalPrice ?? 0) || 0;
  const hasDiscount = Boolean(product.hasDiscount ?? (discountPrice > 0 && discountPrice < basePrice));

  if (hasDiscount) {
    return `${formatCurrency(basePrice)} → ${formatCurrency(discountPrice)}`;
  }

  return formatCurrency(basePrice);
};

const getStockStatusLabel = (status) => {
  const labels = {
    'in-stock': 'In Stock',
    'low-stock': 'Low Stock',
    'out-of-stock': 'Out of Stock'
  };
  return labels[status] || status;
};

const StockBadge = ({ status }) => {
  const badgeClass = `stock-badge stock-badge-${status}`;

  return (
    <span className={badgeClass}>
      {getStockStatusLabel(status)}
    </span>
  );
};

export const ProductTable = ({ products, onEdit, onSoftDelete, onHardDelete, getStockStatus }) => {
  return (
    <div className="product-table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Status</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const stock = product.availableStock ?? product.stock ?? 0;
            const stockStatus = getStockStatus ? getStockStatus(stock) : 'out-of-stock';

            return (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{renderPriceCell(product)}</td>
                <td><StockBadge status={stockStatus} /></td>
                <td>{stock}</td>
                <td>
                  <div className="product-table-actions">
                    <Button variant="secondary" onClick={() => onEdit(product)}>Edit</Button>
                    <Button variant="secondary" onClick={() => onSoftDelete(product.id)}>Soft Delete</Button>
                    <Button variant="secondary" onClick={() => onHardDelete(product.id)}>Hard Delete</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
