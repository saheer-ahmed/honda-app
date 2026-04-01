import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DriverApp from './pages/DriverApp';

const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700;800&family=DM+Mono:wght@400;500&display=swap';

function Router() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>Loading...</div>;
  if (!user) return <Login />;
  if (user.role === 'driver') return <DriverApp />;
  return <Login />;
}

export default function App() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href={GOOGLE_FONTS} rel="stylesheet" />
      <AuthProvider><Router /></AuthProvider>
    </>
  );
}
