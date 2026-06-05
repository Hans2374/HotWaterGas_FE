export const adminModuleMap = {
  '/admin/dashboard':   'dashboard',
  '/admin/products':    'products',
  '/admin/categories':  'categories',
  '/admin/tags':        'tags',
  '/admin/publishers':  'publishers',
  '/admin/developers':  'developers',
};

export function getModuleFromPath(pathname) {
  return adminModuleMap[pathname] || Object.entries(adminModuleMap)
    .find(([path]) => pathname.startsWith(path))?.[1] || 'products';
}

export const moduleMeta = {
  dashboard:   { label: 'Dashboard',   accentVar: '--admin-dashboard-accent' },
  products:    { label: 'Products',    accentVar: '--admin-products-accent' },
  categories:  { label: 'Categories', accentVar: '--admin-categories-accent' },
  tags:        { label: 'Tags',        accentVar: '--admin-tags-accent' },
  publishers:  { label: 'Publishers', accentVar: '--admin-publishers-accent' },
  developers:  { label: 'Developers',  accentVar: '--admin-developers-accent' },
};
