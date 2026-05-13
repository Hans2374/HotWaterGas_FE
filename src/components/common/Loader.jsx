import React from 'react';
import './Loader.css';

export const Loader = ({ text = 'Đang tải...' }) => {
  return <p className="loader-text">{text}</p>;
}
