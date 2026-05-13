import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerHeader } from './CustomerHeader';
import { Footer } from './Footer';
import './MainLayout.css';

export const MainLayout = () => {
  return (
    <div className="main-layout">
      <CustomerHeader />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
