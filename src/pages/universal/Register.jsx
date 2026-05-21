import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const Register = () => {
  return (
    <AuthLayout
      activeCard="register"
      loginForm={<LoginForm />}
      registerForm={<RegisterForm />}
    />
  );
};
