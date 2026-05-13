import { useState } from 'react';
import { maskSteamKey } from '../../utils/formatters';
import './SteamKeyCell.css';

/**
 * SteamKeyCell - Displays a masked Steam key with reveal/hide/copy actions
 * 
 * Features:
 * - Key masked by default
 * - Reveal/Hide toggle
 * - Copy to clipboard
 * - Success feedback
 * - Redemption guide link
 */
export default function SteamKeyCell({ productName, keyValue, redemptionGuideUrl }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayKey = isRevealed ? keyValue : maskSteamKey(keyValue);

  const handleRevealToggle = () => {
    setIsRevealed(!isRevealed);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="steam-key-cell">
      <div className="key-display">
        <code className={`key-value ${isRevealed ? 'revealed' : 'masked'}`}>
          {displayKey}
        </code>
      </div>

      <div className="key-actions">
        <button
          className="key-action-btn"
          onClick={handleRevealToggle}
          title={isRevealed ? 'Ẩn key' : 'Hiện key'}
        >
          {isRevealed ? '🙈 Ẩn' : '👁️ Hiện'}
        </button>

        <button
          className={`key-action-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Sao chép key"
        >
          {copied ? '✓ Đã sao chép' : '📋 Sao chép'}
        </button>

        {redemptionGuideUrl && (
          <a
            href={redemptionGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="key-action-link"
            title="Xem hướng dẫn sử dụng"
          >
            ℹ️ Hướng dẫn
          </a>
        )}
      </div>
    </div>
  );
}
