import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const Login = () => {
  return (
    <AuthLayout
      activeCard="login"
      loginForm={<LoginForm />}
      registerForm={<RegisterForm />}
    />
  );
};
