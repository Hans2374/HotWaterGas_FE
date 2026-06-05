import React, { useCallback } from 'react';
import { getPublishers } from '../../api/productApi';
import { DirectoryPage } from './DirectoryPage';

export const PublisherPage = () => {
  const fetchPublishers = useCallback(() => getPublishers(), []);

  return (
    <DirectoryPage
      entityLabel="Nhà phát hành"
      emptyMessage="Chưa có nhà phát hành nào để hiển thị."
      detailBasePath="/publishers"
      fetchItems={fetchPublishers}
    />
  );
};
