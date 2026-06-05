import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getDeveloperDetailById } from '../../api/productApi';
import { EntityDetailPage } from './EntityDetailPage';

export const DeveloperDetailPage = () => {
  const { id } = useParams();

  const fetchDeveloperDetail = useCallback((developerId) => getDeveloperDetailById(developerId), []);

  return (
    <EntityDetailPage
      entityId={id}
      entityType="Developer"
      title="Sản phẩm theo nhà phát triển"
      fetchEntityDetail={fetchDeveloperDetail}
    />
  );
};
