import React, { useCallback } from 'react';
import { getDevelopers } from '../../api/productApi';
import { DirectoryPage } from './DirectoryPage';

export const DeveloperPage = () => {
  const fetchDevelopers = useCallback(() => getDevelopers(), []);

  return (
    <DirectoryPage
      entityLabel="Nhà phát triển"
      emptyMessage="Chưa có nhà phát triển nào để hiển thị."
      detailBasePath="/developers"
      fetchItems={fetchDevelopers}
    />
  );
};
