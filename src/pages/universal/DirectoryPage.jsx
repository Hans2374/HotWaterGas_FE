import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import './DirectoryPage.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const getLetterKey = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '#';

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const firstChar = normalized.charAt(0);
  return /[A-Z]/.test(firstChar) ? firstChar : '#';
};

export const DirectoryPage = ({
  title,
  subtitle,
  entityLabel,
  emptyMessage,
  detailBasePath,
  fetchItems
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLetter, setActiveLetter] = useState('');
  const sectionRefs = useRef({});

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await fetchItems();
        setItems(Array.isArray(result) ? result : []);
      } catch (apiError) {
        setItems([]);
        setError(apiError.message || `Không thể tải danh sách ${entityLabel.toLowerCase()}.`);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [entityLabel, fetchItems]);

  const groupedSections = useMemo(() => {
    const groups = new Map();

    items.forEach((item) => {
      const letter = getLetterKey(item.name);
      if (!ALPHABET.includes(letter)) {
        return;
      }

      if (!groups.has(letter)) {
        groups.set(letter, []);
      }

      groups.get(letter).push(item);
    });

    return ALPHABET
      .map((letter) => ({
        letter,
        items: (groups.get(letter) || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      }))
      .filter((section) => section.items.length > 0);
  }, [items]);

  const availableLetters = useMemo(
    () => groupedSections.map((section) => section.letter),
    [groupedSections]
  );

  useEffect(() => {
    if (availableLetters.length > 0 && !availableLetters.includes(activeLetter)) {
      setActiveLetter(availableLetters[0]);
    }
  }, [activeLetter, availableLetters]);

  useEffect(() => {
    if (groupedSections.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          const nextLetter = visibleEntries[0].target.getAttribute('data-letter');
          if (nextLetter) {
            setActiveLetter(nextLetter);
          }
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0.1, 0.25, 0.5]
      }
    );

    groupedSections.forEach((section) => {
      const element = sectionRefs.current[section.letter];
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [groupedSections]);

  const handleLetterClick = (letter) => {
    const element = sectionRefs.current[letter];
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveLetter(letter);
  };

  return (
    <>
      <ScrollToTop />
      <div className="directory-page">

        {loading && <Loader text={`Đang tải ${entityLabel.toLowerCase()}...`} />}

        {!loading && error && (
          <section className="directory-state-card">
            <h2>Không thể tải dữ liệu</h2>
            <p>{error}</p>
          </section>
        )}

        {!loading && !error && groupedSections.length === 0 && (
          <section className="directory-state-card">
            <h2>Chưa có dữ liệu</h2>
            <p>{emptyMessage}</p>
          </section>
        )}

        {!loading && !error && groupedSections.length > 0 && (
          <div className="directory-layout">
            <aside className="directory-alphabet-nav" aria-label={`Điều hướng chữ cái ${entityLabel.toLowerCase()}`}>
              {availableLetters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`directory-letter-btn ${activeLetter === letter ? 'is-active' : ''}`}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </aside>

            <div className="directory-content">
              {groupedSections.map((section) => (
                <section
                  key={section.letter}
                  data-letter={section.letter}
                  ref={(element) => {
                    sectionRefs.current[section.letter] = element;
                  }}
                  className="directory-letter-section"
                >
                  <div className="directory-section-header">
                    <h2>{section.letter}</h2>
                    <div className="directory-section-rule" />
                  </div>

                  <div className="directory-card-list">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        to={`${detailBasePath}/${item.id}`}
                        className="directory-card"
                      >
                        <div className="directory-card-logo-wrap">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={item.name} className="directory-card-logo" />
                          ) : (
                            <div className="directory-card-logo directory-card-logo--placeholder">
                              {getLetterKey(item.name)}
                            </div>
                          )}
                        </div>

                        <div className="directory-card-content">
                          <span className="directory-card-name">{item.name}</span>
                        </div>

                        <div className="directory-card-count">({item.totalProducts} sản phẩm)</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
