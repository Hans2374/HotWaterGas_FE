import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPublisherDetailById } from '../../api/productApi';
import { EntityDetailPage } from './EntityDetailPage';

export const PublisherDetailPage = () => {
  const { id } = useParams();

  const fetchPublisherDetail = useCallback((publisherId) => getPublisherDetailById(publisherId), []);

  return (
    <EntityDetailPage
      entityId={id}
      entityType="Publisher"
      title="Sản phẩm theo nhà phát hành"
      fetchEntityDetail={fetchPublisherDetail}
    />
  );
};
