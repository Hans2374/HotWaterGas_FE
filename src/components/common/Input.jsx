import React from 'react';
import './Input.css';

export const Input = ({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = '',
  label = '',
  name = '',
  readOnly = false,
  autoComplete,
  ...rest
}) => {
  return (
    <div className="input-group">
      {label && <label htmlFor={name} className="input-label">{label}</label>}
      <input
        id={name}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        autoComplete={autoComplete}
        className={`input ${error ? 'input-error' : ''}`}
        {...rest}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};
