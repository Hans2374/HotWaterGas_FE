import { useState } from 'react';
import {
  Search,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Info,
  ImageOff
} from 'lucide-react';
import { isSelectedCandidate } from '../../utils/steamSearchRequest';
import './SteamGameSearchSection.css';

/**
 * The Steam game search-and-select panel.
 *
 * This component is strictly presentational: it renders the search
 * controls, the candidate list and the selected candidate, and reports
 * the administrator's intent through callbacks. It never calls the
 * backend itself, never touches the product form, and never persists
 * anything.
 *
 * ── Candidate semantics ─────────────────────────────────────────────────────
 * A candidate is a **pointer** to a store app that might be the product
 * the administrator is looking for. It is not a verified fact. So this
 * panel shows only the thumbnail, the title and the App ID, and it
 * deliberately does **not** show a price, a metascore or a platform, and
 * it does not present Steam's `type` field as proof that the candidate
 * is a full game — Steam reports `type="app"` for demos and soundtracks
 * alike.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 * The candidate list is a `radiogroup`, and every candidate is a real
 * `button` inside it, so the list is reachable and operable with the
 * keyboard alone. Selection is communicated by a check icon and a
 * "Selected" label, not by colour alone.
 */

/**
 * One candidate row.
 *
 * @param {object} props
 */
const CandidateRow = ({ candidate, isSelected, onSelect }) => {
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const showImage = Boolean(candidate.tinyImage) && !hasImageFailed;

  return (
    <button
      type="button"
      className={`steam-candidate ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onSelect(candidate)}
      aria-pressed={isSelected}
      role="radio"
      aria-checked={isSelected}
    >
      <span className="steam-candidate-thumb" aria-hidden="true">
        {showImage ? (
          <img
            className="steam-candidate-image"
            src={candidate.tinyImage}
            alt=""
            loading="lazy"
            onError={() => setHasImageFailed(true)}
          />
        ) : (
          <ImageOff size={18} className="steam-candidate-image-fallback" />
        )}
      </span>

      <span className="steam-candidate-body">
        <span className="steam-candidate-name">{candidate.name}</span>
        <span className="steam-candidate-appid">App ID {candidate.appId}</span>
      </span>

      <span className="steam-candidate-state">
        {isSelected ? (
          <>
            <Check size={15} aria-hidden="true" />
            <span className="steam-candidate-state-label">Selected</span>
          </>
        ) : null}
      </span>
    </button>
  );
};

/**
 * The Steam game search-and-select panel.
 *
 * @param {object} props
 * @param {string} props.productName           The current product name.
 * @param {boolean} props.canSearch             Whether a search may be started.
 * @param {boolean} props.isSearching           Whether a search is running.
 * @param {Array} props.candidates              The candidates to display.
 * @param {object|null} props.selectedCandidate The selected candidate.
 * @param {string|null} props.errorMessage      A controlled error message.
 * @param {string|null} props.emptyMessage      The "no results" message.
 * @param {boolean} props.hasSearched           Whether a search has completed.
 * @param {Function} props.onSearch             Called when the button is pressed.
 * @param {Function} props.onSelect             Called with a candidate.
 * @param {Function} props.onClearSelection     Called to clear the selection.
 * @param {boolean} props.isDisabled            Whether the form is busy.
 */
export const SteamGameSearchSection = ({
  productName,
  canSearch,
  isSearching,
  candidates,
  selectedCandidate,
  errorMessage,
  emptyMessage,
  hasSearched,
  onSearch,
  onSelect,
  onClearSelection,
  isDisabled
}) => {
  const trimmedName = typeof productName === 'string' ? productName.trim() : '';
  const hasCandidates = Array.isArray(candidates) && candidates.length > 0;

  return (
    <section className="form-card steam-search-card">
      <div className="steam-search-header">
        <h3 className="form-card-title steam-search-title">
          <Search size={15} aria-hidden="true" />
          Steam Game Search
        </h3>
        <span className="steam-search-hint">
          Search Steam to select the game whose store description and metadata will be used for
          translation. Nothing is saved with the product.
        </span>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="steam-search-controls">
        <button
          type="button"
          className="btn btn-secondary steam-search-button"
          onClick={onSearch}
          disabled={!canSearch || isDisabled}
        >
          {isSearching ? (
            <Loader2 size={14} className="ai-spin" aria-hidden="true" />
          ) : (
            <Search size={14} aria-hidden="true" />
          )}
          {isSearching ? 'Searching...' : 'Search Steam'}
        </button>

        <span className="steam-search-query">
          {trimmedName
            ? `Searching for "${trimmedName}"`
            : 'Enter a product name to search Steam.'}
        </span>
      </div>

      {/* ── Busy state ───────────────────────────────────────────────────── */}
      {isSearching && (
        <p className="steam-search-status" role="status" aria-live="polite">
          <Loader2 size={14} className="ai-spin" aria-hidden="true" />
          Searching the Steam Store...
        </p>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {errorMessage && !isSearching && (
        <div className="steam-search-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <p className="steam-search-error-message">{errorMessage}</p>
        </div>
      )}

      {/* ── Selected candidate ──────────────────────────────────────────── */}
      {selectedCandidate && (
        <div className="steam-selected">
          <Check size={15} aria-hidden="true" />
          <div className="steam-selected-body">
            <span className="steam-selected-label">Selected Steam game</span>
            <span className="steam-selected-name">{selectedCandidate.name}</span>
            <span className="steam-selected-appid">App ID {selectedCandidate.appId}</span>
          </div>
          <button
            type="button"
            className="steam-selected-clear"
            onClick={onClearSelection}
            disabled={isDisabled}
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        </div>
      )}

      {/* ── Candidates ──────────────────────────────────────────────────── */}
      {hasCandidates && (
        <div className="steam-candidates" role="radiogroup" aria-label="Steam game candidates">
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.appId}
              candidate={candidate}
              isSelected={isSelectedCandidate(selectedCandidate, candidate)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {hasSearched && !isSearching && !errorMessage && !hasCandidates && (
        <p className="steam-search-status">
          <Info size={14} aria-hidden="true" />
          {emptyMessage}
        </p>
      )}

      {/* ── Nothing selected yet ────────────────────────────────────────── */}
      {!hasSearched && !isSearching && !errorMessage && !selectedCandidate && (
        <p className="steam-search-status">
          <Info size={14} aria-hidden="true" />
          A Steam game selection is required before generating a Vietnamese description. The
          translation is made from the Steam store description, so select a candidate first.
        </p>
      )}
    </section>
  );
};
