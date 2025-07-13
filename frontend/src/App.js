import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

const App = () => {
  const [siteConfig, setSiteConfig] = useState({});
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(true);

  // Auth forms state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });

  // Game state
  const [diceGame, setDiceGame] = useState({ target: 50, amount: 10, over: true });
  const [gameResult, setGameResult] = useState(null);

  // Admin state
  const [adminConfig, setAdminConfig] = useState({});
  const [configToUpdate, setConfigToUpdate] = useState({});

  useEffect(() => {
    loadSiteConfig();
    checkAuth();
  }, []);

  useEffect(() => {
    if (siteConfig.primary_color) {
      document.documentElement.style.setProperty('--primary-color', siteConfig.primary_color);
    }
    if (siteConfig.secondary_color) {
      document.documentElement.style.setProperty('--secondary-color', siteConfig.secondary_color);
    }
    if (siteConfig.accent_color) {
      document.documentElement.style.setProperty('--accent-color', siteConfig.accent_color);
    }
  }, [siteConfig]);

  const loadSiteConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setSiteConfig(response.data);
    } catch (error) {
      console.error('Error loading site config:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      getUserInfo();
    }
  };

  const getUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setUser(response.data.user);
      setCurrentPage('home');
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/register`, registerForm);
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setUser(response.data.user);
      setCurrentPage('home');
      setRegisterForm({ username: '', email: '', password: '' });
    } catch (error) {
      alert('Registration failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentPage('home');
  };

  const playDice = async () => {
    try {
      const response = await axios.post(`${API}/games/dice/play`, diceGame);
      setGameResult(response.data);
      // Refresh user info to get updated balance
      getUserInfo();
    } catch (error) {
      alert('Game error: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const loadAdminConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/config`);
      setAdminConfig(response.data);
      setConfigToUpdate(response.data);
    } catch (error) {
      alert('Error loading admin config: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const updateAdminConfig = async () => {
    try {
      await axios.post(`${API}/admin/config`, configToUpdate);
      alert('Configuration updated successfully!');
      loadSiteConfig(); // Reload public config
      loadAdminConfig(); // Reload admin config
    } catch (error) {
      alert('Error updating config: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/admin/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url;
    } catch (error) {
      alert('Upload error: ' + (error.response?.data?.detail || 'Unknown error'));
      return null;
    }
  };

  const handleImageUpload = async (e, configKey) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadFile(file);
      if (url) {
        setConfigToUpdate({...configToUpdate, [configKey]: `${BACKEND_URL}${url}`});
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black bg-opacity-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {siteConfig.logo_url && (
              <img src={siteConfig.logo_url} alt="Logo" className="h-10 w-10 rounded-full" />
            )}
            <h1 className="text-2xl font-bold text-white">{siteConfig.site_title}</h1>
          </div>
          <nav className="flex items-center space-x-6">
            {user ? (
              <>
                <span className="text-white">Balance: ${user.balance?.toFixed(2) || '0.00'}</span>
                <button onClick={() => setCurrentPage('games')} className="text-white hover:text-yellow-400">Games</button>
                {user.is_admin && (
                  <button onClick={() => { setCurrentPage('admin'); loadAdminConfig(); }} className="text-white hover:text-yellow-400">Admin</button>
                )}
                <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Logout</button>
              </>
            ) : (
              <button onClick={() => setCurrentPage('auth')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Login</button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-bold text-white mb-6">
          {siteConfig.hero_title}
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          {siteConfig.hero_subtitle}
        </p>
        <button 
          onClick={() => user ? setCurrentPage('games') : setCurrentPage('auth')}
          className="bg-yellow-500 text-black px-8 py-4 rounded-lg text-xl font-bold hover:bg-yellow-400 transition-colors"
        >
          {siteConfig.hero_cta}
        </button>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {siteConfig.features?.map((feature, index) => (
            <div key={index} className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg text-center">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderAuth = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg w-full max-w-md">
        <div className="flex mb-6">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-center ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 text-center ${authMode === 'register' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
          >
            Register
          </button>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              className="w-full p-3 rounded bg-white bg-opacity-20 text-white placeholder-gray-300"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full p-3 rounded bg-white bg-opacity-20 text-white placeholder-gray-300"
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700">
              Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={registerForm.username}
              onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
              className="w-full p-3 rounded bg-white bg-opacity-20 text-white placeholder-gray-300"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
              className="w-full p-3 rounded bg-white bg-opacity-20 text-white placeholder-gray-300"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
              className="w-full p-3 rounded bg-white bg-opacity-20 text-white placeholder-gray-300"
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700">
              Register
            </button>
          </form>
        )}

        <button
          onClick={() => setCurrentPage('home')}
          className="w-full mt-4 text-gray-300 hover:text-white"
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  const renderGames = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Games</h1>
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-yellow-400">
            Back to Home
          </button>
        </div>

        {/* Dice Game */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">🎲 Dice Game</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Bet Amount</label>
                <input
                  type="number"
                  value={diceGame.amount}
                  onChange={(e) => setDiceGame({...diceGame, amount: parseFloat(e.target.value)})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Target Number</label>
                <input
                  type="number"
                  value={diceGame.target}
                  onChange={(e) => setDiceGame({...diceGame, target: parseFloat(e.target.value)})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setDiceGame({...diceGame, over: true})}
                  className={`flex-1 py-3 rounded ${diceGame.over ? 'bg-green-600' : 'bg-gray-600'} text-white`}
                >
                  Over {diceGame.target}
                </button>
                <button
                  onClick={() => setDiceGame({...diceGame, over: false})}
                  className={`flex-1 py-3 rounded ${!diceGame.over ? 'bg-red-600' : 'bg-gray-600'} text-white`}
                >
                  Under {diceGame.target}
                </button>
              </div>
              
              <button
                onClick={playDice}
                className="w-full bg-yellow-500 text-black py-4 rounded-lg text-xl font-bold hover:bg-yellow-400"
              >
                Play Dice
              </button>
            </div>
            
            {gameResult && (
              <div className="bg-black bg-opacity-30 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">Game Result</h3>
                <div className="space-y-2 text-white">
                  <p>Roll: <span className="font-bold text-yellow-400">{gameResult.roll}</span></p>
                  <p>Target: {gameResult.target} ({gameResult.over ? 'Over' : 'Under'})</p>
                  <p>Result: <span className={`font-bold ${gameResult.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {gameResult.result.toUpperCase()}
                  </span></p>
                  <p>Multiplier: {gameResult.multiplier.toFixed(2)}x</p>
                  <p>Payout: ${gameResult.payout.toFixed(2)}</p>
                  <p>New Balance: ${gameResult.new_balance.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-yellow-400">
            Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Site Configuration */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Site Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Site Title</label>
                <input
                  type="text"
                  value={configToUpdate.site_title || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, site_title: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Site Description</label>
                <textarea
                  value={configToUpdate.site_description || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, site_description: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Primary Color</label>
                <input
                  type="color"
                  value={configToUpdate.primary_color || '#3b82f6'}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, primary_color: e.target.value})}
                  className="w-full h-12 rounded"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo_url')}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
                {configToUpdate.logo_url && (
                  <img src={configToUpdate.logo_url} alt="Logo preview" className="mt-2 h-16 w-16 rounded" />
                )}
              </div>
              
              <div>
                <label className="block text-white mb-2">Hero Title</label>
                <input
                  type="text"
                  value={configToUpdate.hero_title || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, hero_title: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Hero Subtitle</label>
                <textarea
                  value={configToUpdate.hero_subtitle || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, hero_subtitle: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Payment Configuration */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-6">MercadoPago Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Access Token</label>
                <input
                  type="password"
                  value={configToUpdate.mercadopago_access_token || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, mercadopago_access_token: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  placeholder="TEST-xxxx or APP_USR-xxxx"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Public Key</label>
                <input
                  type="text"
                  value={configToUpdate.mercadopago_public_key || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, mercadopago_public_key: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  placeholder="TEST-xxxx or APP_USR-xxxx"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Client ID</label>
                <input
                  type="text"
                  value={configToUpdate.mercadopago_client_id || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, mercadopago_client_id: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Client Secret</label>
                <input
                  type="password"
                  value={configToUpdate.mercadopago_client_secret || ''}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, mercadopago_client_secret: e.target.value})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Minimum Deposit</label>
                <input
                  type="number"
                  value={configToUpdate.min_deposit || 10}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, min_deposit: parseFloat(e.target.value)})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Maximum Deposit</label>
                <input
                  type="number"
                  value={configToUpdate.max_deposit || 10000}
                  onChange={(e) => setConfigToUpdate({...configToUpdate, max_deposit: parseFloat(e.target.value)})}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={updateAdminConfig}
          className="w-full mt-8 bg-green-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-700"
        >
          Save All Configuration
        </button>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'auth':
        return renderAuth();
      case 'games':
        return renderGames();
      case 'admin':
        return user?.is_admin ? renderAdmin() : renderHome();
      default:
        return renderHome();
    }
  };

  return renderCurrentPage();
};

export default App;