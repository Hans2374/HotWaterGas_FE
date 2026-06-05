import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

export const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Column 1: Brand / About */}
        <div className="footer-column">
          <div className="footer-brand">
            <div className="footer-brand-group">
              <img
                src="/icon.png"
                alt="HotWaterGas logo"
                className="brand-logo brand-logo--footer"
              />
              <h3 className="footer-brand-title">HotWaterGas</h3>
            </div>
            <p className="footer-brand-description">
              Thị trường trò chơi kỹ thuật số cho khóa Steam và nội dung trò chơi PC.
            </p>
          </div>
          <p className="footer-copyright">
            © {currentYear} HotWaterGas. Mọi quyền được bảo lưu.
          </p>
        </div>

        {/* Column 2: Navigation */}
        <div className="footer-column">
          <h4 className="footer-column-title">Điều hướng</h4>
          <nav className="footer-links">
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('/')}
            >
              Trang chủ
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('/products/search')}
            >
              Steam Key Chính Hãng
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('/categories')}
            >
              Các Thể Loại Game Thịnh Hành
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('/publishers')}
            >
              Các Nhà Phát Hành
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => handleNavigate('/developers')}
            >
              Các Nhà Phát Triển
            </button>
          </nav>
        </div>

        {/* Column 3: Support */}
        <div className="footer-column">
          <h4 className="footer-column-title">Hỗ trợ</h4>
          <nav className="footer-links">
            <a href="#" className="footer-link">
              Trung tâm trợ giúp
            </a>
            <a href="#" className="footer-link">
              Liên hệ chúng tôi
            </a>
            <a href="#" className="footer-link">
              Chính sách hoàn tiền
            </a>
            <a href="#" className="footer-link">
              Điều khoản dịch vụ
            </a>
          </nav>
        </div>

        {/* Column 4: Community */}
        <div className="footer-column">
          <h4 className="footer-column-title">Cộng đồng</h4>
          <nav className="footer-links">
            <a href="#" className="footer-link">
              Facebook
            </a>
            <a href="#" className="footer-link">
              Discord
            </a>
            <a href="#" className="footer-link">
              Steam News
            </a>
            <a href="#" className="footer-link">
              Blog
            </a>
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-bottom-text">
          Các trò chơi kỹ thuật số cao cấp, được giao ngay lập tức.
        </p>
      </div>
    </footer>
  );
};
