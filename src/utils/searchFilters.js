const toPositiveNumberOrEmpty = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return '';
  }

  return String(parsed);
};

const normalizeTagSlugs = (value) => {
  if (!value) {
    return [];
  }

  const tags = Array.isArray(value)
    ? value
    : String(value).split(',');

  return Array.from(new Set(tags
    .map((item) => String(item || '').trim())
    .filter(Boolean)));
};

export const parseFiltersFromSearchParams = (searchParams) => {
  const category = (searchParams.get('category') || '').trim();
  const tags = normalizeTagSlugs(searchParams.get('tags'));
  const minPrice = toPositiveNumberOrEmpty(searchParams.get('minPrice'));
  const maxPrice = toPositiveNumberOrEmpty(searchParams.get('maxPrice'));

  return {
    category,
    tags,
    minPrice,
    maxPrice
  };
};

export const serializeTags = (tags) => normalizeTagSlugs(tags).join(',');

export const buildSearchQueryParams = ({
  searchQuery = '',
  page = 1,
  sortBy = 'name',
  sortDirection = 'asc',
  filters = {}
}) => {
  const next = new URLSearchParams();

  const trimmedQuery = String(searchQuery || '').trim();
  if (trimmedQuery) {
    next.set('q', trimmedQuery);
  }

  const parsedPage = Number(page);
  if (!Number.isNaN(parsedPage) && parsedPage > 1) {
    next.set('page', String(parsedPage));
  }

  if (sortBy) {
    next.set('sort', sortBy);
  }

  if (sortDirection) {
    next.set('direction', sortDirection);
  }

  const category = String(filters.category || '').trim();
  if (category) {
    next.set('category', category);
  }

  const tags = serializeTags(filters.tags || []);
  if (tags) {
    next.set('tags', tags);
  }

  const minPrice = toPositiveNumberOrEmpty(filters.minPrice);
  const maxPrice = toPositiveNumberOrEmpty(filters.maxPrice);

  if (minPrice) {
    next.set('minPrice', minPrice);
  }

  if (maxPrice) {
    next.set('maxPrice', maxPrice);
  }

  return next;
};
