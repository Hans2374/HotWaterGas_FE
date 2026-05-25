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
  rightIcon,
  ...rest
}) => {
  return (
    <div className="input-group">
      {label && <label htmlFor={name} className="input-label">{label}</label>}
      <div className="input-wrapper">
        <input
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className={`input ${error ? 'input-error' : ''} ${rightIcon ? 'input--with-icon' : ''}`}
          {...rest}
        />
        {rightIcon && (
          <span className="input-icon input-icon--right">{rightIcon}</span>
        )}
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};
