import { useState } from 'react';
import { maskSteamKey } from '../../utils/formatters';
import './SteamKeyCell.css';

/**
 * SteamKeyCell - Premium Steam key display with reveal/copy/guide actions.
 * Designed to feel like a game launcher license card.
 */
export default function SteamKeyCell({ productName, keyValue, redemptionGuideUrl }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedKey = maskSteamKey(keyValue);

  const handleRevealToggle = () => {
    setIsRevealed((prev) => !prev);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy Steam key');
    }
  };

  return (
    <div className="steam-key-cell">
      <div className="steam-key-card">
        <div className="steam-key-header">
          <div className="steam-key-header-left">
            <svg
              className="steam-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0h-.001zM10.70 18.959c-.667.191-1.425.285-2.193.285a7.723 7.723 0 01-.256-.012l-.695 1.005L7.375 18.51a7.676 7.676 0 01-.167-1.478c0-1.032.201-2.024.587-2.946l3.738 2.648-.003.003a3.32 3.32 0 01-.82 2.221zm.708-2.832a3.326 3.326 0 002.194-.902l-3.594-2.547-.002.002a3.319 3.319 0 011.403 3.447zm4.566-3.09l1.878 1.327c.014-.09.022-.182.022-.277 0-.376-.081-.738-.219-1.077l-1.681.027zm-2.18-1.388l3.346 2.373c.11-.316.176-.651.176-.999 0-.31-.034-.613-.094-.908l-3.428 1.534zm.693-1.615l2.941-1.312a7.806 7.806 0 01-.094.918c0 .195.016.385.043.572l.021.139-.037.001a3.35 3.35 0 01-.016.387c0 .206.033.406.082.602l-3.016 1.349.076-3.656zm1.088-3.274l3.225 1.441c.041-.192.066-.387.066-.586 0-.348-.066-.688-.182-1.012l-3.109 1.157zm3.128-1.173c-.18.295-.416.559-.697.784l2.267-.844a3.43 3.43 0 00-.102-.398c-.047-.134-.098-.265-.16-.39l-1.308 1.848zM10.28 5.12a3.33 3.33 0 013.328 3.33 3.33 3.33 0 01-3.33 3.33 3.33 3.33 0 01-3.329-3.33 3.33 3.33 0 013.33-3.33zm9.4 0c0 .348-.066.688-.182 1.012l3.226 1.44c.041-.193.066-.388.066-.587 0-.348-.066-.688-.182-1.012l-2.928 1.147z"/>
            </svg>
            <span className="steam-key-label">Steam Key</span>
          </div>
          <div className="steam-key-actions">
            <button
              type="button"
              className="key-btn key-btn--reveal"
              onClick={handleRevealToggle}
              title={isRevealed ? 'Ẩn key' : 'Hiện key'}
              aria-pressed={isRevealed}
            >
              {isRevealed ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <span>Ẩn</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Hiện</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`key-btn key-btn--copy ${copied ? 'key-btn--copied' : ''}`}
              onClick={handleCopy}
              title="Sao chép key"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  <span>Sao chép</span>
                </>
              )}
            </button>

            {redemptionGuideUrl && (
              <a
                href={redemptionGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="key-btn key-btn--guide"
                title="Hướng dẫn kích hoạt"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Hướng dẫn</span>
              </a>
            )}
          </div>
        </div>

        <div className="steam-key-display" aria-live="polite">
          <code className={`steam-key-value ${isRevealed ? 'steam-key-value--revealed' : 'steam-key-value--masked'}`}>
            {isRevealed ? keyValue : maskedKey}
          </code>
        </div>
      </div>
    </div>
  );
}
