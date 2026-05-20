export const adminModuleMap = {
  '/admin/dashboard':  'dashboard',
  '/admin/products':   'products',
  '/admin/categories': 'categories',
  '/admin/tags':       'tags',
};

export function getModuleFromPath(pathname) {
  return adminModuleMap[pathname] || Object.entries(adminModuleMap)
    .find(([path]) => pathname.startsWith(path))?.[1] || 'products';
}

export const moduleMeta = {
  dashboard:  { label: 'Dashboard',  accentVar: '--admin-dashboard-accent' },
  products:   { label: 'Products',   accentVar: '--admin-products-accent' },
  categories: { label: 'Categories', accentVar: '--admin-categories-accent' },
  tags:       { label: 'Tags',       accentVar: '--admin-tags-accent' },
};
