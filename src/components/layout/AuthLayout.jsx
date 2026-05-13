import React from 'react';
import './AuthLayout.css';

export const AuthLayout = ({ children, title }) => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        {title && <h1 className="auth-title">{title}</h1>}
        {children}
      </div>
    </div>
  );
};
