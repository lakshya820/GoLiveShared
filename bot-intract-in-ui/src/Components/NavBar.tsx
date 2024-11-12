// NavBar.tsx
import React from 'react';
import '../css/NavBar.css';
import { useNavigate } from 'react-router-dom';

const NavBar: React.FC = () => {

  const navigate = useNavigate();

  const handleToDashboard = () => {
    // Perform login logic here
    navigate('/main/dashboard');
  };

  const handleToTests = () => {
    // Perform login logic here
    navigate('/tests1');
  };

  return (
    <div className="navbar">
      <button className="nav-button" onClick={handleToDashboard}>Dashboard </button>
      <button className="nav-button" onClick={handleToTests}>Tests</button>
      <button className="nav-button">Settings</button>
    </div>
  );
};

export default NavBar;
