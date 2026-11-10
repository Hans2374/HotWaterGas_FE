import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Plus, X, GripVertical, Image as ImageIcon, Layout, Flag, Images, Search, ChevronDown, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getCategories, getTags, uploadProductImage, uploadBulkProductImages } from '../../services/productService';
import { getPublishers } from '../../services/publisherService';
import { getDevelopers } from '../../services/developerService';
import { generateAiDescription } from '../../services/aiDescriptionService';
import { searchSteamGames } from '../../services/steamSearchService';
import { validateAiDescriptionRequest } from '../../utils/aiDescriptionRequest';
import {
  buildAiDescriptionApplyPatch,
  extractAiDescriptionText,
  mergeAiDescriptionRequirements
} from '../../utils/aiDescriptionMapping';
import {
  cancelAiDescriptionReplaceConfirmation,
  confirmAiDescriptionReplace,
  createAiDescriptionState,
  discardAiDescription,
  editAiDescriptionText,
  failAiDescriptionRequest,
  requestAiDescriptionReplaceConfirmation,
  selectAiDescriptionPlatform,
  startAiDescriptionRequest,
  succeedAiDescriptionRequest
} from '../../utils/aiDescriptionState';
import {
  canSearchSteam,
  selectedAppId
} from '../../utils/steamSearchRequest';
import {
  clearSteamSearchForNewName,
  clearSteamSelection,
  createSteamSearchState,
  failSteamSearch,
  isStaleSteamResponse,
  resetSteamSearch,
  selectSteamCandidate,
  startSteamSearch,
  succeedSteamSearch
} from '../../utils/steamSearchState';
import { AiDescriptionDraftSection } from './AiDescriptionDraftSection';
import { SteamGameSearchSection } from './SteamGameSearchSection';
import './ProductForm.css';

const createInitialErrors = () => ({
  name: '',
  description: '',
  price: '',
  publisherId: '',
  developerId: '',
  platform: '',
  cardImage: '',
  categoryId: '',
  discountPercentage: ''
});

const createEmptyRequirementSpec = () => ({
  os: '',
  processor: '',
  memory: '',
  graphics: '',
  storage: '',
  notes: ''
});

const normalizeRequirementSpec = (spec) => {
  const fallback = createEmptyRequirementSpec();
  return {
    os: spec?.os ?? fallback.os,
    processor: spec?.processor ?? fallback.processor,
    memory: spec?.memory ?? fallback.memory,
    graphics: spec?.graphics ?? fallback.graphics,
    storage: spec?.storage ?? fallback.storage,
    notes: spec?.notes ?? fallback.notes
  };
};

const normalizeImageEntry = (image) => {
  if (typeof image === 'string') return { id: null, url: image };
  return {
    id: image?.id ?? image?.Id ?? null,
    url: image?.url ?? image?.Url ?? image?.imageUrl ?? image?.ImageUrl ?? ''
  };
};

const normalizeTagIds = (ids) => (Array.isArray(ids) ? ids.filter(Boolean) : []);

const createInitialImagesData = (initialData) => {
  const rawImages = normalizeImageEntries(initialData?.images, initialData?.imageUrls);

  return {
    cardImage: rawImages.find((_, i) => i === 0) || null,
    heroImage: rawImages.find((_, i) => i === 1) || null,
    galleryImages: rawImages.slice(2)
  };
};

const normalizeImageEntries = (images = [], fallbackUrls = []) => {
  const source = Array.isArray(images) && images.length > 0 ? images : fallbackUrls;
  return source
    .map(normalizeImageEntry)
    .map((image) => ({
      id: image.id || null,
      url: typeof image.url === 'string' ? image.url : ''
    }))
    .filter((image) => image.url.trim().length > 0);
};

const createInitialData = (initialData) => ({
  name: '',
  description: '',
  price: '',
  discountPercentage: '',
  publisherId: '',
  developerId: '',
  releaseDate: '',
  platform: '',
  categoryId: '',
  tagIds: [],
  systemRequirements: {
    minimum: createEmptyRequirementSpec(),
    recommended: createEmptyRequirementSpec()
  },
  ...initialData,
  ...createInitialImagesData(initialData),
  systemRequirements: {
    minimum: normalizeRequirementSpec(initialData?.systemRequirements?.minimum),
    recommended: normalizeRequirementSpec(initialData?.systemRequirements?.recommended)
  }
});

const ImageUploadSlot = ({
  image,
  onUpload,
  onRemove,
  isUploading,
  uploadError,
  disabled,
  label,
  helperText,
  aspectRatio = 'square',
  accent = false
}) => {
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file) onUpload(file);
    event.target.value = '';
  };

  return (
    <div className={`image-slot ${image ? 'has-image' : ''} ${aspectRatio === 'banner' ? 'banner-slot' : ''} ${accent ? 'accent-slot' : ''}`}>
      <input
        ref={inputRef}
        id={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
        className="file-input-hidden"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {image ? (
        <div className="image-slot-preview">
          <img src={image.url} alt={label} />
          <div className="image-slot-actions">
            <button
              type="button"
              className="image-slot-action-btn replace-btn"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
              title="Replace image"
            >
              Replace
            </button>
            <button
              type="button"
              className="image-slot-action-btn remove-btn"
              onClick={onRemove}
              disabled={disabled || isUploading}
              title="Remove image"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`image-slot-placeholder ${isUploading ? 'uploading' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (disabled || isUploading) return;
            inputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!disabled && !isUploading) inputRef.current?.click();
            }
          }}
        >
          {isUploading ? (
            <div className="tile-spinner" />
          ) : (
            <>
              <Plus size={20} className="slot-icon" />
              <span className="slot-label">Upload Image</span>
            </>
          )}
        </div>
      )}

      {uploadError && <span className="input-error-message slot-error">{uploadError}</span>}
    </div>
  );
};

const GalleryImageTile = ({
  image,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  disabled
}) => {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(index);
  };

  return (
    <div
      className={`gallery-tile ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <img src={image.url} alt={`Gallery image ${index + 1}`} />
      <div className="gallery-tile-overlay">
        <button
          type="button"
          className="gallery-drag-handle"
          title="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>
        <button
          type="button"
          className="gallery-remove-btn"
          onClick={() => onRemove(index)}
          disabled={disabled}
          title="Remove image"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export const ProductForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState(createInitialData(initialData));
  const [errors, setErrors] = useState(createInitialErrors());
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [isLookupLoading, setIsLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');

  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({});

  const [bulkUploadProgress, setBulkUploadProgress] = useState({ active: false, done: 0, total: 0, failed: [] });

  const [galleryDragIndex, setGalleryDragIndex] = useState(null);

  const [galleryInputKey, setGalleryInputKey] = useState(0);
  const galleryFileInputRef = useRef(null);
  const galleryBulkFileInputRef = useRef(null);

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isTagsMenuOpen, setIsTagsMenuOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isPublisherMenuOpen, setIsPublisherMenuOpen] = useState(false);
  const [publisherSearchTerm, setPublisherSearchTerm] = useState('');
  const [isDeveloperMenuOpen, setIsDeveloperMenuOpen] = useState(false);
  const [developerSearchTerm, setDeveloperSearchTerm] = useState('');

  // ── AI translation draft state ─────────────────────────────────────────
  // A *translation*, held apart from `formData`. It reaches the product
  // form only through an explicit Apply.
  //
  // The transitions live in `utils/aiDescriptionState.js` as pure
  // functions, so the lifecycle rules are verifiable without a DOM.
  const [aiDescription, setAiDescription] = useState(createAiDescriptionState);
  // Monotonic request id. A response whose id is not the latest one is
  // discarded, so a slow translation can never overwrite a newer draft,
  // and a response for a previous product name or Steam selection can
  // never replace the current draft.
  const aiDescriptionRequestIdRef = useRef(0);
  // A synchronous in-flight flag. It closes the window in which two
  // clicks in the same tick would both issue a request: React has not
  // re-rendered yet, so the state flag would still read `false`.
  const aiDescriptionInFlightRef = useRef(false);
  // ── Steam game search state ──────────────────────────────────────────
  // The selected Steam candidate is deliberately held outside
  // `formData`, so it can never reach the product payload and can never
  // be written to the product database. It is transient request context
  // for the AI translation endpoint only.
  //
  // The transitions live in `utils/steamSearchState.js` as pure
  // functions, so the lifecycle rules are verifiable without a DOM.
  const [steamSearch, setSteamSearch] = useState(createSteamSearchState);
  // Monotonic request id. A response whose id is not the latest one is
  // discarded, so a slow search can never overwrite newer results.
  const steamSearchRequestIdRef = useRef(0);
  const categoryMenuRef = useRef(null);
  const tagsMenuRef = useRef(null);
  const publisherMenuRef = useRef(null);
  const developerMenuRef = useRef(null);

  const discountPercentage = Number(formData.discountPercentage || 0);

  const pricePreview = useMemo(() => {
    const basePrice = Number(formData.price || 0);
    if (!basePrice || Number.isNaN(basePrice)) return 0;
    const pct = discountPercentage;
    if (!pct || Number.isNaN(pct) || pct <= 0) return basePrice;
    return Math.max(0, basePrice - (basePrice * pct / 100));
  }, [formData.price, discountPercentage]);

  const discountSavings = useMemo(() => {
    const base = Number(formData.price || 0);
    if (!base || Number.isNaN(base)) return 0;
    return base - pricePreview;
  }, [formData.price, pricePreview]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === formData.categoryId) || null,
    [categories, formData.categoryId]
  );

  const selectedPublisher = useMemo(
    () => publishers.find((publisher) => publisher.id === formData.publisherId) || null,
    [publishers, formData.publisherId]
  );

  const selectedDeveloper = useMemo(
    () => developers.find((developer) => developer.id === formData.developerId) || null,
    [developers, formData.developerId]
  );

  const filteredCategories = useMemo(() => {
    const keyword = categorySearchTerm.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((category) =>
      category.name?.toLowerCase().includes(keyword) || category.slug?.toLowerCase().includes(keyword)
    );
  }, [categories, categorySearchTerm]);

  const filteredPublishers = useMemo(() => {
    const keyword = publisherSearchTerm.trim().toLowerCase();
    if (!keyword) return publishers;
    return publishers.filter((publisher) =>
      publisher.name?.toLowerCase().includes(keyword) || publisher.slug?.toLowerCase().includes(keyword)
    );
  }, [publishers, publisherSearchTerm]);

  const filteredDevelopers = useMemo(() => {
    const keyword = developerSearchTerm.trim().toLowerCase();
    if (!keyword) return developers;
    return developers.filter((developer) =>
      developer.name?.toLowerCase().includes(keyword) || developer.slug?.toLowerCase().includes(keyword)
    );
  }, [developers, developerSearchTerm]);

  const selectedTagIds = useMemo(() => normalizeTagIds(formData.tagIds), [formData.tagIds]);

  const filteredTags = useMemo(() => {
    const keyword = tagSearchTerm.trim().toLowerCase();
    if (!keyword) return tags;
    return tags.filter((tag) =>
      tag.name?.toLowerCase().includes(keyword) || tag.slug?.toLowerCase().includes(keyword)
    );
  }, [tags, tagSearchTerm]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  );

  useEffect(() => {
    const fresh = createInitialData(initialData);
    setFormData(fresh);
    setErrors(createInitialErrors());
    setUploadErrors({});
    setGalleryInputKey((prev) => prev + 1);

    // A different product was loaded. The translation belongs to the
    // previous product, so it is discarded rather than left to be
    // applied to the new one.
    aiDescriptionRequestIdRef.current += 1;
    aiDescriptionInFlightRef.current = false;
    setAiDescription(discardAiDescription);

    // The same applies to the Steam selection: one product's selected
    // App ID must never leak into another product's form session. The
    // pending search is invalidated too, so its late response cannot
    // repopulate the candidates for the wrong product.
    steamSearchRequestIdRef.current += 1;
    setSteamSearch(resetSteamSearch);
  }, [initialData]);

  useEffect(() => {
    const loadLookups = async () => {
      setIsLookupLoading(true);
      setLookupError('');
      try {
        const [categoryResult, tagResult, publisherResult, developerResult] = await Promise.all([
          getCategories(),
          getTags(),
          getPublishers(),
          getDevelopers()
        ]);
        setCategories(categoryResult || []);
        setTags(tagResult || []);
        setPublishers(publisherResult || []);
        setDevelopers(developerResult || []);
      } catch (apiError) {
        setLookupError(apiError.message || 'Failed to load form data.');
      } finally {
        setIsLookupLoading(false);
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(event.target)) {
        setIsTagsMenuOpen(false);
      }
      if (publisherMenuRef.current && !publisherMenuRef.current.contains(event.target)) {
        setIsPublisherMenuOpen(false);
      }
      if (developerMenuRef.current && !developerMenuRef.current.contains(event.target)) {
        setIsDeveloperMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  /**
   * Search the Steam Store for candidates matching the product name.
   *
   * The request is guarded by a monotonic id, so a slow response for an
   * older query can never replace newer results.
   */
  const handleSearchSteam = async () => {
    if (!canSearchSteam({
      productName: formData.name,
      isSearching: steamSearch.isSearching
    })) {
      return;
    }

    const requestId = steamSearchRequestIdRef.current + 1;
    steamSearchRequestIdRef.current = requestId;

    setSteamSearch(startSteamSearch);

    try {
      const result = await searchSteamGames(formData.name);

      // A newer search has started in the meantime, or the product name
      // changed: discard this response rather than letting a stale one
      // overwrite fresher state.
      if (isStaleSteamResponse(requestId, steamSearchRequestIdRef.current)) return;

      setSteamSearch((prev) => succeedSteamSearch(prev, result));
    } catch (apiError) {
      if (isStaleSteamResponse(requestId, steamSearchRequestIdRef.current)) return;

      // A failed search does NOT clear an existing selection: the admin
      // may have selected a candidate already, and losing it because a
      // later search failed would be surprising. Only an explicit clear
      // or a product-name change removes the selection.
      setSteamSearch((prev) => failSteamSearch(
        prev,
        apiError?.message || 'Failed to search Steam. Please try again.'
      ));
    }
  };

  /**
   * Select a Steam candidate.
   *
   * The selection is transient: it is request context for the AI
   * translation endpoint, and it is never part of the product payload.
   */
  const handleSelectSteamCandidate = (candidate) => {
    if (!candidate) return;

    // Selecting invalidates any pending search response, so a late
    // response cannot replace the candidate list the admin is choosing
    // from.
    steamSearchRequestIdRef.current += 1;

    // The same applies to a pending translation: the response would
    // describe the previously selected game, so it must not replace the
    // current draft.
    aiDescriptionRequestIdRef.current += 1;

    setSteamSearch((prev) => selectSteamCandidate(prev, candidate));
  };

  /**
   * Clear the Steam selection explicitly.
   */
  const handleClearSteamSelection = () => {
    setSteamSearch((prev) => clearSteamSelection(prev));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    // The product name is the Steam search query. When it changes, the
    // candidates on screen describe a different game, so the selection
    // and the results are cleared and the admin must search again.
    // Otherwise a stale App ID could be sent to the translation endpoint
    // for a product it does not belong to.
    if (name === 'name') {
      // The name changed, so the old candidates describe a different
      // game: clear the selection and the results, and invalidate any
      // pending search so its late response is discarded.
      steamSearchRequestIdRef.current += 1;
      setSteamSearch(clearSteamSearchForNewName);

      // A pending translation was made for the old name and the old
      // Steam selection, so it can no longer describe this product.
      aiDescriptionRequestIdRef.current += 1;

      // The *settled* draft must go too, not just the pending request.
      //
      // A translation of the previous name describes a different game.
      // Leaving it in place would let the administrator apply a
      // translation of one game to a product that has been renamed to
      // another — the exact leak the route-level product switch already
      // prevents. So the draft is discarded here exactly as it is there.
      aiDescriptionInFlightRef.current = false;
      setAiDescription(discardAiDescription);
    }
  };

  const handleCategoryChange = (event) => {
    setFormData((prev) => ({ ...prev, categoryId: event.target.value }));
    setErrors((prev) => ({ ...prev, categoryId: '' }));
  };

  const handleSelectCategory = (categoryId) => {
    setFormData((prev) => ({ ...prev, categoryId }));
    setErrors((prev) => ({ ...prev, categoryId: '' }));
    setIsCategoryMenuOpen(false);
    setCategorySearchTerm('');
  };

  const handleToggleCategoryMenu = () => {
    setIsCategoryMenuOpen((prev) => !prev);
    setIsTagsMenuOpen(false);
    setCategorySearchTerm('');
  };

  const handleToggleTagsMenu = () => {
    setIsTagsMenuOpen((prev) => !prev);
    setIsCategoryMenuOpen(false);
    setTagSearchTerm('');
  };

  const handleSelectPublisher = (publisherId) => {
    setFormData((prev) => ({ ...prev, publisherId }));
    setErrors((prev) => ({ ...prev, publisherId: '' }));
    setIsPublisherMenuOpen(false);
    setPublisherSearchTerm('');
  };

  const handleTogglePublisherMenu = () => {
    setIsPublisherMenuOpen((prev) => !prev);
    setIsCategoryMenuOpen(false);
    setIsTagsMenuOpen(false);
    setIsDeveloperMenuOpen(false);
    setPublisherSearchTerm('');
  };

  const handleSelectDeveloper = (developerId) => {
    setFormData((prev) => ({ ...prev, developerId }));
    setErrors((prev) => ({ ...prev, developerId: '' }));
    setIsDeveloperMenuOpen(false);
    setDeveloperSearchTerm('');
  };

  const handleToggleDeveloperMenu = () => {
    setIsDeveloperMenuOpen((prev) => !prev);
    setIsCategoryMenuOpen(false);
    setIsTagsMenuOpen(false);
    setIsPublisherMenuOpen(false);
    setDeveloperSearchTerm('');
  };

  const handleRemoveTag = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: normalizeTagIds(prev.tagIds).filter((id) => id !== tagId)
    }));
  };

  const handleToggleTag = (tagId) => {
    setFormData((prev) => {
      const current = normalizeTagIds(prev.tagIds);
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      return { ...prev, tagIds: next };
    });
  };

  const handleSystemRequirementChange = (tier, field, value) => {
    setFormData((prev) => ({
      ...prev,
      systemRequirements: {
        ...prev.systemRequirements,
        [tier]: { ...prev.systemRequirements[tier], [field]: value }
      }
    }));
  };

  /* ── AI translation handlers ─────────────────────────────────────────── */

  /**
   * Request a Vietnamese translation of the selected Steam description.
   *
   * This never saves anything. It only asks the backend for a
   * translation and stores the result in the translation state for
   * review.
   *
   * The Steam App ID is transient request context: it is sent with the
   * translation request and never becomes part of the product payload.
   */
  const handleGenerateAiDescription = async () => {
    // A duplicate request is refused before it is issued.
    //
    // The guard is a **ref**, not the state flag: two clicks in the same
    // tick would both read the same stale `isGenerating` value, because
    // React has not re-rendered yet. The ref is updated synchronously,
    // so the second click sees it immediately.
    if (aiDescriptionInFlightRef.current) return;

    const appId = selectedAppId(steamSearch.selected);

    const validation = validateAiDescriptionRequest({
      productName: formData.name,
      steamAppId: appId
    });

    if (!validation.ok) {
      setAiDescription((prev) => failAiDescriptionRequest(prev, { status: 400, message: validation.reason }));
      return;
    }

    const requestId = aiDescriptionRequestIdRef.current + 1;
    aiDescriptionRequestIdRef.current = requestId;
    aiDescriptionInFlightRef.current = true;

    setAiDescription(startAiDescriptionRequest);

    try {
      const translation = await generateAiDescription(formData.name, appId);

      // A newer request has started in the meantime: discard this one
      // rather than letting a stale response replace a fresh draft.
      // This is what stops a response for an old product name or an old
      // Steam selection from replacing the current draft.
      if (requestId !== aiDescriptionRequestIdRef.current) return;

      setAiDescription((prev) => succeedAiDescriptionRequest(
        prev,
        translation,
        extractAiDescriptionText(translation)
      ));
    } catch (apiError) {
      // A failed translation preserves the existing draft and its edits:
      // `failAiDescriptionRequest` only sets the error, and never clears the
      // translation or the edited text.
      if (requestId !== aiDescriptionRequestIdRef.current) return;

      setAiDescription((prev) => failAiDescriptionRequest(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to translate the Steam description.'
      }));
    } finally {
      if (requestId === aiDescriptionRequestIdRef.current) {
        aiDescriptionInFlightRef.current = false;
      }
    }
  };

  /**
   * Discard the translation. The product form is left exactly as it was.
   */
  const handleDismissAiDescription = () => {
    // Invalidate any in-flight request so its response is discarded.
    aiDescriptionRequestIdRef.current += 1;
    aiDescriptionInFlightRef.current = false;
    setAiDescription(discardAiDescription);
  };

  /**
   * The administrator edited the translated text.
   *
   * The edit lives in the translation state, not in the product form, so
   * editing can never modify the form prematurely.
   */
  const handleeditAiDescriptionText = (text) => {
    setAiDescription((prev) => editAiDescriptionText(prev, text));
  };

  /**
   * Ask for confirmation before an edited translation is replaced.
   *
   * The administrator's edits are real work. Replacing them without
   * asking would be the one failure mode this whole feature exists to
   * avoid.
   */
  const handleRequestAiDescriptionReplace = () => {
    setAiDescription(requestAiDescriptionReplaceConfirmation);
  };

  /**
   * Keep the edited translation. The confirmation is dismissed and
   * nothing else changes.
   */
  const handleCancelAiDescriptionReplace = () => {
    setAiDescription(cancelAiDescriptionReplaceConfirmation);
  };

  /**
   * Confirm the replacement. The edited text is replaced by the fresh
   * translation.
   */
  const handleconfirmAiDescriptionReplace = () => {
    setAiDescription(confirmAiDescriptionReplace);
    handleGenerateAiDescription();
  };

  /**
   * Record the administrator's explicit platform choice.
   *
   * The choice is `null` until they make one. It is never derived from
   * the returned list by the frontend.
   */
  const handleselectAiDescriptionPlatform = (platform) => {
    setAiDescription((prev) => selectAiDescriptionPlatform(prev, platform));
  };

  /**
   * Apply the reviewed translation to the form fields.
   *
   * This is a deliberate action. It fills form fields only — it never
   * saves, and the product is persisted solely by the form's own save
   * action.
   *
   * `platform` is the value the administrator explicitly chose in the
   * review panel. It is `null` when they have not chosen one, and then
   * the platform field is left untouched: the product form has a single
   * platform field, and the frontend never picks one of several
   * platforms by itself.
   */
  const handleApplyAiDescription = (platform) => {
    if (!aiDescription.translation) return;

    const patch = buildAiDescriptionApplyPatch(aiDescription.translation, {
      descriptionText: aiDescription.text,
      platform
    });
    if (Object.keys(patch).length === 0) {
      toast.error('There is nothing in the translation to apply.');
      return;
    }

    setFormData((prev) => {
      const next = { ...prev };

      if (typeof patch.description === 'string') {
        next.description = patch.description;
      }

      if (typeof patch.platform === 'string') {
        next.platform = patch.platform;
      }

      if (typeof patch.releaseDate === 'string') {
        next.releaseDate = patch.releaseDate;
      }

      if (patch.minimum || patch.recommended) {
        next.systemRequirements = mergeAiDescriptionRequirements(prev.systemRequirements, patch);
      }

      return next;
    });

    // The applied fields are now the form's own; the translation's job
    // is done.
    setAiDescription(discardAiDescription);

    toast.success('Translation applied to the form. Review it, then save the product.');
  };

  const uploadImage = async (file, slotKey) => {
    setUploadingSlot(slotKey);
    setUploadErrors((prev) => ({ ...prev, [slotKey]: '' }));
    try {
      const uploadedUrl = await uploadProductImage(file);
      if (!uploadedUrl) throw new Error('Upload returned an empty URL.');
      return uploadedUrl;
    } catch (apiError) {
      setUploadErrors((prev) => ({ ...prev, [slotKey]: apiError.message || 'Failed to upload image.' }));
      return null;
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleCardImageUpload = async (file) => {
    const url = await uploadImage(file, 'cardImage');
    if (url) {
      setFormData((prev) => ({ ...prev, cardImage: { id: null, url } }));
      setErrors((prev) => ({ ...prev, cardImage: '' }));
    }
  };

  const handleCardImageRemove = () => {
    setFormData((prev) => ({ ...prev, cardImage: null }));
  };

  const handleHeroImageUpload = async (file) => {
    const url = await uploadImage(file, 'heroImage');
    if (url) {
      setFormData((prev) => ({ ...prev, heroImage: { id: null, url } }));
    }
  };

  const handleHeroImageRemove = () => {
    setFormData((prev) => ({ ...prev, heroImage: null }));
  };

  const handleGalleryFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'gallery');
    if (url) {
      setFormData((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, { id: null, url }]
      }));
    }
    event.target.value = '';
  };

  const handleGalleryBulkFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setBulkUploadProgress({ active: true, done: 0, total: files.length, failed: [] });

    const { uploaded, failed } = await uploadBulkProductImages(files);

    setFormData((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, ...uploaded]
    }));

    setBulkUploadProgress({ active: false, done: files.length, total: files.length, failed });
    event.target.value = '';
  };

  const handleRemoveGalleryImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index)
    }));
  };

  const handleGalleryDragStart = (index) => {
    setGalleryDragIndex(index);
  };

  const handleGalleryDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGalleryDrop = (e, dropIndex) => {
    e.preventDefault();
    if (galleryDragIndex === null || galleryDragIndex === dropIndex) {
      setGalleryDragIndex(null);
      return;
    }
    setFormData((prev) => {
      const updated = [...prev.galleryImages];
      const [moved] = updated.splice(galleryDragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return { ...prev, galleryImages: updated };
    });
    setGalleryDragIndex(null);
  };

  const validate = () => {
    const nextErrors = createInitialErrors();
    if (!formData.name.trim()) nextErrors.name = 'Name is required.';
    if (!formData.description.trim()) nextErrors.description = 'Description is required.';

    const priceValue = Number(formData.price);
    if (formData.price === '' || Number.isNaN(priceValue)) {
      nextErrors.price = 'Price is required.';
    } else if (priceValue < 0) {
      nextErrors.price = 'Price must be 0 or greater.';
    }

    const discountPct = Number(formData.discountPercentage);
    if (formData.discountPercentage !== '' && !Number.isNaN(discountPct)) {
      if (discountPct < 0) {
        nextErrors.discountPercentage = 'Discount cannot be negative.';
      } else if (discountPct > 100) {
        nextErrors.discountPercentage = 'Discount cannot exceed 100%.';
      }
    }

    if (!formData.publisherId) nextErrors.publisherId = 'Publisher is required.';
    if (!formData.developerId) nextErrors.developerId = 'Developer is required.';
    if (!formData.platform.trim()) nextErrors.platform = 'Platform is required.';

    if (!formData.cardImage) nextErrors.cardImage = 'Product Card Image is required.';
    if (!formData.categoryId) nextErrors.categoryId = 'Please select a category.';

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const tagIds = normalizeTagIds(formData.tagIds);
    const discountPct = Number(formData.discountPercentage);
    const finalDiscountPercentage = formData.discountPercentage !== '' && !Number.isNaN(discountPct) && discountPct > 0
      ? discountPct
      : null;

    const builtImages = [];
    if (formData.cardImage) {
      builtImages.push({ id: formData.cardImage.id || null, url: formData.cardImage.url.trim() });
    }
    if (formData.heroImage) {
      builtImages.push({ id: formData.heroImage.id || null, url: formData.heroImage.url.trim() });
    }
    for (const img of formData.galleryImages) {
      if (img.url.trim()) {
        builtImages.push({ id: img.id || null, url: img.url.trim() });
      }
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      discountPercentage: finalDiscountPercentage,
      images: builtImages,
      imageUrls: builtImages.map((item) => item.url),
      categoryId: formData.categoryId || null,
      tagIds,
      publisherId: formData.publisherId || null,
      developerId: formData.developerId || null,
      metadata: {
        releaseDate: formData.releaseDate || null,
        platform: formData.platform.trim()
      },
      systemRequirements: {
        minimum: {
          os: formData.systemRequirements.minimum.os.trim(),
          processor: formData.systemRequirements.minimum.processor.trim(),
          memory: formData.systemRequirements.minimum.memory.trim(),
          graphics: formData.systemRequirements.minimum.graphics.trim(),
          storage: formData.systemRequirements.minimum.storage.trim(),
          notes: formData.systemRequirements.minimum.notes.trim()
        },
        recommended: {
          os: formData.systemRequirements.recommended.os.trim(),
          processor: formData.systemRequirements.recommended.processor.trim(),
          memory: formData.systemRequirements.recommended.memory.trim(),
          graphics: formData.systemRequirements.recommended.graphics.trim(),
          storage: formData.systemRequirements.recommended.storage.trim(),
          notes: formData.systemRequirements.recommended.notes.trim()
        }
      }
    };
    await onSubmit(payload);
  };

  if (isLookupLoading) {
    return <p className="product-form-message">Loading form data...</p>;
  }
  if (lookupError) {
    return <p className="product-form-message error">{lookupError}</p>;
  }

  const hasActiveDiscount = discountPercentage > 0;
  const showPricingPreview = Number(formData.price) > 0;

  return (
    <form className="product-form" onSubmit={handleSubmit}>

      {/* Basic Information */}
      <section className="form-card">
        <h3 className="form-card-title">Basic Information</h3>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-name">Product Name</label>
            <input
              id="field-name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              disabled={isSubmitting}
            />
            {errors.name && <span className="input-error-message">{errors.name}</span>}
          </div>

          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-desc">Full Description</label>
            <textarea
              id="field-desc"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Complete product description"
              disabled={isSubmitting}
            />
            {errors.description && <span className="input-error-message">{errors.description}</span>}
          </div>
        </div>
      </section>

      {/* Steam Game Search */}
      <SteamGameSearchSection
        productName={formData.name}
        canSearch={canSearchSteam({
          productName: formData.name,
          isSearching: steamSearch.isSearching
        })}
        isSearching={steamSearch.isSearching}
        candidates={steamSearch.candidates}
        selectedCandidate={steamSearch.selected}
        errorMessage={steamSearch.error}
        emptyMessage={steamSearch.emptyMessage}
        hasSearched={steamSearch.hasSearched}
        onSearch={handleSearchSteam}
        onSelect={handleSelectSteamCandidate}
        onClearSelection={handleClearSteamSelection}
        isDisabled={isSubmitting}
      />

      {/* AI Description Translation */}
      <AiDescriptionDraftSection
        isGenerating={aiDescription.isGenerating}
        error={aiDescription.error}
        translation={aiDescription.translation}
        draftText={aiDescription.text}
        onDraftTextChange={handleeditAiDescriptionText}
        onGenerate={handleGenerateAiDescription}
        onRegenerate={handleGenerateAiDescription}
        onApply={handleApplyAiDescription}
        onDismiss={handleDismissAiDescription}
        canApply={Boolean(aiDescription.translation) && aiDescription.text.trim().length > 0}
        hasSteamSelection={Boolean(steamSearch.selected)}
        hasEditedDraft={
          Boolean(aiDescription.translation)
          && aiDescription.text.trim() !== extractAiDescriptionText(aiDescription.translation).trim()
        }
        isConfirmingReplace={aiDescription.isConfirmingReplace}
        selectedPlatform={aiDescription.chosenPlatform}
        onPlatformSelect={handleselectAiDescriptionPlatform}
        onRequestReplace={handleRequestAiDescriptionReplace}
        onConfirmReplace={handleconfirmAiDescriptionReplace}
        onCancelReplace={handleCancelAiDescriptionReplace}
        isDisabled={isSubmitting}
      />

      {/* Pricing */}
      <section className="form-card">
        <h3 className="form-card-title">Pricing</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-price">Base Price</label>
            <input
              id="field-price"
              className={`form-input ${errors.price ? 'error' : ''}`}
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.price && <span className="input-error-message">{errors.price}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-discount">Discount Percentage (%)</label>
            <input
              id="field-discount"
              className={`form-input ${errors.discountPercentage ? 'error' : ''}`}
              type="number"
              name="discountPercentage"
              value={formData.discountPercentage}
              onChange={handleChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.01"
              disabled={isSubmitting}
            />
            <span className="input-hint">Enter 0 or leave blank for no discount.</span>
            {errors.discountPercentage && <span className="input-error-message">{errors.discountPercentage}</span>}
          </div>
        </div>

        {showPricingPreview && (
          <div className="pricing-preview">
            <div className="pricing-preview-row">
              <span className="pricing-preview-label">Original Price</span>
              <span className="pricing-preview-value pricing-original">
                {Number(formData.price || 0).toLocaleString()}
              </span>
            </div>
            {hasActiveDiscount && (
              <div className="pricing-preview-row">
                <span className="pricing-preview-label">Discount</span>
                <span className="pricing-preview-value pricing-discount">
                  -{discountPercentage}%
                </span>
              </div>
            )}
            <div className="pricing-preview-divider" />
            <div className="pricing-preview-row">
              <span className="pricing-preview-label">Final Price</span>
              <span className={`pricing-preview-value pricing-final ${hasActiveDiscount ? 'has-discount' : ''}`}>
                {pricePreview.toLocaleString()}
              </span>
            </div>
            {hasActiveDiscount && discountSavings > 0 && (
              <p className="pricing-preview-savings">
                Customers save {discountSavings.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── IMAGES ─────────────────────────────────── */}
      <section className="form-card">
        <h3 className="form-card-title">Images</h3>

        {/* ── Product Card Image ── */}
        <div className="image-role-section">
          <div className="image-role-header">
            <div className="image-role-icon card-icon">
              <Layout size={14} />
            </div>
            <div className="image-role-text">
              <span className="image-role-title">Product Card Image</span>
              <span className="image-role-badge required">Required</span>
            </div>
          </div>
          <p className="image-role-helper">Used for product cards throughout the store.</p>

          <ImageUploadSlot
            image={formData.cardImage}
            onUpload={handleCardImageUpload}
            onRemove={handleCardImageRemove}
            isUploading={uploadingSlot === 'cardImage'}
            uploadError={uploadErrors.cardImage || ''}
            disabled={isSubmitting}
            label="Product Card Image"
            accent
          />
          {errors.cardImage && <span className="input-error-message slot-error">{errors.cardImage}</span>}
        </div>

        <div className="image-role-divider" />

        {/* ── Hero Banner Image ── */}
        <div className="image-role-section">
          <div className="image-role-header">
            <div className="image-role-icon hero-icon">
              <Flag size={14} />
            </div>
            <div className="image-role-text">
              <span className="image-role-title">Hero Banner Image</span>
              <span className="image-role-badge optional">Optional</span>
            </div>
          </div>
          <p className="image-role-helper">Used for homepage featured banners.</p>

          <ImageUploadSlot
            image={formData.heroImage}
            onUpload={handleHeroImageUpload}
            onRemove={handleHeroImageRemove}
            isUploading={uploadingSlot === 'heroImage'}
            uploadError={uploadErrors.heroImage || ''}
            disabled={isSubmitting}
            label="Hero Banner Image"
            aspectRatio="banner"
          />
        </div>

        <div className="image-role-divider" />

        {/* ── Gallery Images ── */}
        <div className="image-role-section">
          <div className="image-role-header">
            <div className="image-role-icon gallery-icon">
              <Images size={14} />
            </div>
            <div className="image-role-text">
              <span className="image-role-title">Gallery Images</span>
              <span className="image-role-badge optional">Optional</span>
            </div>
          </div>
          <p className="image-role-helper">Additional screenshots shown on the product detail page. Drag to reorder.</p>

          {formData.galleryImages.length > 0 && (
            <div className="gallery-grid">
              {formData.galleryImages.map((image, index) => (
                <GalleryImageTile
                  key={`gallery-${image.id || index}-${index}`}
                  image={image}
                  index={index}
                  onRemove={handleRemoveGalleryImage}
                  onDragStart={handleGalleryDragStart}
                  onDragOver={(e) => handleGalleryDragOver(e, index)}
                  onDrop={(e) => handleGalleryDrop(e, index)}
                  isDragging={galleryDragIndex === index}
                  disabled={isSubmitting || uploadingSlot === 'gallery'}
                />
              ))}
            </div>
          )}

          <div className="gallery-add-area">
            <input
              ref={galleryFileInputRef}
              id={`gallery-file-input-${galleryInputKey}`}
              key={galleryInputKey}
              className="file-input-hidden"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleGalleryFileChange}
              disabled={isSubmitting || uploadingSlot === 'gallery' || bulkUploadProgress.active}
            />
            <input
              ref={galleryBulkFileInputRef}
              id={`gallery-bulk-file-input-${galleryInputKey}`}
              key={`bulk-${galleryInputKey}`}
              className="file-input-hidden"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleGalleryBulkFileChange}
              disabled={isSubmitting || uploadingSlot === 'gallery' || bulkUploadProgress.active}
            />

            <div className="gallery-add-actions">
              <button
                type="button"
                className={`gallery-add-btn ${uploadingSlot === 'gallery' ? 'uploading' : ''}`}
                onClick={() => galleryFileInputRef.current?.click()}
                disabled={isSubmitting || uploadingSlot === 'gallery' || bulkUploadProgress.active}
              >
                {uploadingSlot === 'gallery' ? (
                  <div className="tile-spinner" />
                ) : (
                  <>
                    <Plus size={15} />
                    Add Gallery Image
                  </>
                )}
              </button>

              <button
                type="button"
                className={`gallery-bulk-btn ${bulkUploadProgress.active ? 'uploading' : ''}`}
                onClick={() => galleryBulkFileInputRef.current?.click()}
                disabled={isSubmitting || uploadingSlot === 'gallery' || bulkUploadProgress.active}
                title="Select multiple images at once"
              >
                {bulkUploadProgress.active ? (
                  <div className="tile-spinner" />
                ) : (
                  <>
                    <Upload size={14} />
                    Bulk Import
                  </>
                )}
              </button>
            </div>

            {bulkUploadProgress.active && (
              <div className="bulk-upload-progress">
                <span className="bulk-upload-label">
                  Uploading {bulkUploadProgress.total} images...
                </span>
              </div>
            )}

            {!bulkUploadProgress.active && bulkUploadProgress.total > 0 && (
              <div className="bulk-upload-summary">
                {bulkUploadProgress.failed.length === 0 ? (
                  <span className="bulk-upload-success">
                    {bulkUploadProgress.total} image{bulkUploadProgress.total !== 1 ? 's' : ''} imported successfully.
                  </span>
                ) : (
                  <span className="bulk-upload-partial">
                    {bulkUploadProgress.total - bulkUploadProgress.failed.length} of {bulkUploadProgress.total} images imported.
                    {bulkUploadProgress.failed.length > 0 && (
                      <span className="bulk-upload-failed-list">
                        {' '}Failed: {bulkUploadProgress.failed.map((f) => f.fileName).join(', ')}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category & Tags */}
      <section className="form-card">
        <h3 className="form-card-title">Organization</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-category-search">Category</label>
            <div
              className={`search-select ${errors.categoryId ? 'error' : ''} ${isCategoryMenuOpen ? 'open' : ''}`}
              ref={categoryMenuRef}
            >
              <button
                type="button"
                id="field-category-search"
                className="search-select-trigger"
                onClick={handleToggleCategoryMenu}
                disabled={isSubmitting || isLookupLoading}
                aria-expanded={isCategoryMenuOpen}
              >
                <span className={`search-select-trigger-text ${selectedCategory ? '' : 'placeholder'}`}>
                  {selectedCategory?.name || 'Select a category'}
                </span>
                <ChevronDown size={16} className="search-select-trigger-icon" />
              </button>

              {isCategoryMenuOpen && (
                <div className="search-select-menu" role="listbox">
                  <div className="search-select-search">
                    <Search size={14} className="search-select-search-icon" />
                    <input
                      type="text"
                      className="search-select-search-input"
                      value={categorySearchTerm}
                      onChange={(event) => setCategorySearchTerm(event.target.value)}
                      placeholder="Search category..."
                      autoFocus
                    />
                  </div>

                  <div className="search-select-options">
                    <button
                      type="button"
                      className={`search-select-option ${!formData.categoryId ? 'selected' : ''}`}
                      onClick={() => handleSelectCategory('')}
                    >
                      <span>Unassigned</span>
                      {!formData.categoryId && <Check size={14} className="search-select-check" />}
                    </button>

                    {filteredCategories.map((category) => {
                      const selected = formData.categoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`search-select-option ${selected ? 'selected' : ''}`}
                          onClick={() => handleSelectCategory(category.id)}
                        >
                          <span>{category.name}</span>
                          {selected && <Check size={14} className="search-select-check" />}
                        </button>
                      );
                    })}

                    {filteredCategories.length === 0 && (
                      <div className="search-select-empty">No categories found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.categoryId && <span className="input-error-message">{errors.categoryId}</span>}
          </div>

          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="field-tags-search">Tags <span className="optional-label">(optional)</span></label>
            <div
              className={`search-select multi ${isTagsMenuOpen ? 'open' : ''}`}
              ref={tagsMenuRef}
            >
              <button
                type="button"
                id="field-tags-search"
                className="search-select-trigger multi"
                onClick={handleToggleTagsMenu}
                disabled={isSubmitting || isLookupLoading}
                aria-expanded={isTagsMenuOpen}
              >
                <span className={`search-select-trigger-text ${selectedTags.length > 0 ? '' : 'placeholder'}`}>
                  {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` : 'Select tags'}
                </span>
                <ChevronDown size={16} className="search-select-trigger-icon" />
              </button>

              {isTagsMenuOpen && (
                <div className="search-select-menu" role="listbox">
                  <div className="search-select-search">
                    <Search size={14} className="search-select-search-icon" />
                    <input
                      type="text"
                      className="search-select-search-input"
                      value={tagSearchTerm}
                      onChange={(event) => setTagSearchTerm(event.target.value)}
                      placeholder="Search tags..."
                      autoFocus
                    />
                  </div>

                  <div className="search-select-options">
                    {filteredTags.map((tag) => {
                      const selected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`search-select-option ${selected ? 'selected' : ''}`}
                          onClick={() => handleToggleTag(tag.id)}
                        >
                          <span>{tag.name}</span>
                          {selected && <Check size={14} className="search-select-check" />}
                        </button>
                      );
                    })}

                    {filteredTags.length === 0 && (
                      <div className="search-select-empty">No tags found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedTags.length > 0 ? (
              <div className="selected-tags-chips">
                {selectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="selected-tag-chip"
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={isSubmitting}
                    title={`Remove ${tag.name}`}
                  >
                    <span>{tag.name}</span>
                    <X size={12} />
                  </button>
                ))}
              </div>
            ) : (
              <span className="input-hint">No tags selected.</span>
            )}
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="form-card">
        <h3 className="form-card-title">Product Details</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="input-label" htmlFor="field-publisher-search">Publisher</label>
            <div
              className={`search-select ${errors.publisherId ? 'error' : ''} ${isPublisherMenuOpen ? 'open' : ''}`}
              ref={publisherMenuRef}
            >
              <button
                type="button"
                id="field-publisher-search"
                className="search-select-trigger"
                onClick={handleTogglePublisherMenu}
                disabled={isSubmitting || isLookupLoading}
                aria-expanded={isPublisherMenuOpen}
              >
                <span className={`search-select-trigger-text ${selectedPublisher ? '' : 'placeholder'}`}>
                  {selectedPublisher?.name || 'Select publisher'}
                </span>
                <ChevronDown size={16} className="search-select-trigger-icon" />
              </button>

              {isPublisherMenuOpen && (
                <div className="search-select-menu" role="listbox">
                  <div className="search-select-search">
                    <Search size={14} className="search-select-search-icon" />
                    <input
                      type="text"
                      className="search-select-search-input"
                      value={publisherSearchTerm}
                      onChange={(event) => setPublisherSearchTerm(event.target.value)}
                      placeholder="Search publisher..."
                      autoFocus
                    />
                  </div>

                  <div className="search-select-options">
                    <button
                      type="button"
                      className={`search-select-option ${!formData.publisherId ? 'selected' : ''}`}
                      onClick={() => handleSelectPublisher('')}
                    >
                      <span>Unassigned</span>
                      {!formData.publisherId && <Check size={14} className="search-select-check" />}
                    </button>

                    {filteredPublishers.map((publisher) => {
                      const selected = formData.publisherId === publisher.id;
                      return (
                        <button
                          key={publisher.id}
                          type="button"
                          className={`search-select-option ${selected ? 'selected' : ''}`}
                          onClick={() => handleSelectPublisher(publisher.id)}
                        >
                          <span>{publisher.name}</span>
                          {selected && <Check size={14} className="search-select-check" />}
                        </button>
                      );
                    })}

                    {filteredPublishers.length === 0 && (
                      <div className="search-select-empty">No publishers found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.publisherId && <span className="input-error-message">{errors.publisherId}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-developer-search">Developer</label>
            <div
              className={`search-select ${errors.developerId ? 'error' : ''} ${isDeveloperMenuOpen ? 'open' : ''}`}
              ref={developerMenuRef}
            >
              <button
                type="button"
                id="field-developer-search"
                className="search-select-trigger"
                onClick={handleToggleDeveloperMenu}
                disabled={isSubmitting || isLookupLoading}
                aria-expanded={isDeveloperMenuOpen}
              >
                <span className={`search-select-trigger-text ${selectedDeveloper ? '' : 'placeholder'}`}>
                  {selectedDeveloper?.name || 'Select developer'}
                </span>
                <ChevronDown size={16} className="search-select-trigger-icon" />
              </button>

              {isDeveloperMenuOpen && (
                <div className="search-select-menu" role="listbox">
                  <div className="search-select-search">
                    <Search size={14} className="search-select-search-icon" />
                    <input
                      type="text"
                      className="search-select-search-input"
                      value={developerSearchTerm}
                      onChange={(event) => setDeveloperSearchTerm(event.target.value)}
                      placeholder="Search developer..."
                      autoFocus
                    />
                  </div>

                  <div className="search-select-options">
                    <button
                      type="button"
                      className={`search-select-option ${!formData.developerId ? 'selected' : ''}`}
                      onClick={() => handleSelectDeveloper('')}
                    >
                      <span>Unassigned</span>
                      {!formData.developerId && <Check size={14} className="search-select-check" />}
                    </button>

                    {filteredDevelopers.map((developer) => {
                      const selected = formData.developerId === developer.id;
                      return (
                        <button
                          key={developer.id}
                          type="button"
                          className={`search-select-option ${selected ? 'selected' : ''}`}
                          onClick={() => handleSelectDeveloper(developer.id)}
                        >
                          <span>{developer.name}</span>
                          {selected && <Check size={14} className="search-select-check" />}
                        </button>
                      );
                    })}

                    {filteredDevelopers.length === 0 && (
                      <div className="search-select-empty">No developers found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.developerId && <span className="input-error-message">{errors.developerId}</span>}
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-release-date">Release Date <span className="optional-label">(optional)</span></label>
            <input
              id="field-release-date"
              className="form-input"
              type="date"
              name="releaseDate"
              value={formData.releaseDate}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label className="input-label" htmlFor="field-platform">Platform</label>
            <input
              id="field-platform"
              className={`form-input ${errors.platform ? 'error' : ''}`}
              type="text"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              placeholder="Windows, macOS, Linux"
              disabled={isSubmitting}
            />
            {errors.platform && <span className="input-error-message">{errors.platform}</span>}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="form-card">
        <h3 className="form-card-title">System Requirements</h3>
        <div className="requirements-grid">
          <div className="req-card">
            <h4 className="req-card-title">Minimum</h4>
            <div className="form-grid">
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-os">OS</label>
                <input id="req-min-os" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.os}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'os', e.target.value)}
                  placeholder="Windows 10 64-bit" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-proc">Processor</label>
                <input id="req-min-proc" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.processor}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'processor', e.target.value)}
                  placeholder="Intel Core i5-4460" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-mem">Memory</label>
                <input id="req-min-mem" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.memory}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'memory', e.target.value)}
                  placeholder="8 GB RAM" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-gfx">Graphics</label>
                <input id="req-min-gfx" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.graphics}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'graphics', e.target.value)}
                  placeholder="NVIDIA GTX 960" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-min-sto">Storage</label>
                <input id="req-min-sto" className="form-input" type="text"
                  value={formData.systemRequirements.minimum.storage}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'storage', e.target.value)}
                  placeholder="50 GB" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field form-field-full">
                <label className="input-label" htmlFor="req-min-notes">Notes <span className="optional-label">(optional)</span></label>
                <textarea id="req-min-notes" className="form-textarea"
                  value={formData.systemRequirements.minimum.notes}
                  onChange={(e) => handleSystemRequirementChange('minimum', 'notes', e.target.value)}
                  rows={2} maxLength={500} placeholder="Additional notes"
                  disabled={isSubmitting} />
              </div>
            </div>
          </div>

          <div className="req-card">
            <h4 className="req-card-title">Recommended</h4>
            <div className="form-grid">
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-os">OS</label>
                <input id="req-rec-os" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.os}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'os', e.target.value)}
                  placeholder="Windows 11 64-bit" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-proc">Processor</label>
                <input id="req-rec-proc" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.processor}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'processor', e.target.value)}
                  placeholder="Intel Core i7-9700K" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-mem">Memory</label>
                <input id="req-rec-mem" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.memory}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'memory', e.target.value)}
                  placeholder="16 GB RAM" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-gfx">Graphics</label>
                <input id="req-rec-gfx" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.graphics}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'graphics', e.target.value)}
                  placeholder="NVIDIA RTX 3060" maxLength={300} disabled={isSubmitting} />
              </div>
              <div className="form-field">
                <label className="input-label" htmlFor="req-rec-sto">Storage</label>
                <input id="req-rec-sto" className="form-input" type="text"
                  value={formData.systemRequirements.recommended.storage}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'storage', e.target.value)}
                  placeholder="60 GB SSD" maxLength={100} disabled={isSubmitting} />
              </div>
              <div className="form-field form-field-full">
                <label className="input-label" htmlFor="req-rec-notes">Notes <span className="optional-label">(optional)</span></label>
                <textarea id="req-rec-notes" className="form-textarea"
                  value={formData.systemRequirements.recommended.notes}
                  onChange={(e) => handleSystemRequirementChange('recommended', 'notes', e.target.value)}
                  rows={2} maxLength={500} placeholder="Additional notes"
                  disabled={isSubmitting} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-create-product"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};
