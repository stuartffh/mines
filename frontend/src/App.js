import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import NotificationSystem from './components/NotificationSystem';
import AnimatedDice from './components/AnimatedDice';
import AnimatedMinesGrid from './components/AnimatedMinesGrid';
import AnimatedCrash from './components/AnimatedCrash';

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
  const [minesGame, setMinesGame] = useState({ amount: 10, mines_count: 3, gameId: null, grid: Array(25).fill('hidden'), currentMultiplier: 1.0 });
  const [crashGame, setCrashGame] = useState({ amount: 10, auto_cash_out: null, isPlaying: false, currentMultiplier: 1.0 });
  const [gameResult, setGameResult] = useState(null);

  // Payment state
  const [depositAmount, setDepositAmount] = useState(50);
  const [withdrawAmount, setWithdrawAmount] = useState(20);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);

  // Animation state
  const [diceRolling, setDiceRolling] = useState(false);
  const [crashGameState, setCrashGameState] = useState({ isPlaying: false, gameEnded: false });
  const [notifications, setNotifications] = useState([]);

  // Admin state
  const [adminConfig, setAdminConfig] = useState({});
  const [configToUpdate, setConfigToUpdate] = useState({});
  const [gameConfigs, setGameConfigs] = useState({});
  const [adminStats, setAdminStats] = useState({});

  // Notification system
  const addNotification = (type, title, message, amount = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, type, title, message, amount, duration };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
      setUser({...response.data.user, balance: response.data.user.balance || 0});
      setCurrentPage('home');
      setLoginForm({ username: '', password: '' });
      addNotification('win', '🎉 Welcome Back!', `Logged in as ${response.data.user.username}`);
    } catch (error) {
      addNotification('error', 'Login Failed', error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/register`, registerForm);
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setUser({...response.data.user, balance: response.data.user.balance || (response.data.user.is_admin ? 100 : 50)});
      setCurrentPage('home');
      setRegisterForm({ username: '', email: '', password: '' });
      addNotification('win', '🎉 Welcome!', `Account created for ${response.data.user.username}`, response.data.user.is_admin ? 100 : 50);
    } catch (error) {
      addNotification('error', 'Registration Failed', error.response?.data?.detail || 'Unknown error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentPage('home');
  };

  // Payment functions
  const createDeposit = async () => {
    try {
      const response = await axios.post(`${API}/payments/deposit/create`, {
        amount: depositAmount
      });
      
      // Redirect to MercadoPago checkout
      window.open(response.data.init_point, '_blank');
      
      addNotification('info', '💳 Deposit Created', 'Opening MercadoPago checkout...');
      
      // Start checking payment status
      checkPaymentStatus(response.data.transaction_id);
    } catch (error) {
      addNotification('error', 'Deposit Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const checkPaymentStatus = async (transactionId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/payments/status/${transactionId}`);
        if (response.data.status === 'completed') {
          clearInterval(interval);
          addNotification('win', '💰 Deposit Completed!', 'Money added to your account', response.data.amount);
          getUserInfo(); // Refresh balance
          loadPaymentHistory();
        } else if (response.data.status === 'failed' || response.data.status === 'rejected') {
          clearInterval(interval);
          addNotification('error', 'Payment Failed', 'Your payment was not processed');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);

    // Stop checking after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const requestWithdrawal = async () => {
    try {
      const response = await axios.post(`${API}/payments/withdraw/request`, {
        amount: withdrawAmount,
        payment_method: 'pix'
      });
      
      addNotification('info', '🏦 Withdrawal Requested', 'Awaiting admin approval', -withdrawAmount);
      getUserInfo(); // Refresh balance
      loadPaymentHistory();
    } catch (error) {
      addNotification('error', 'Withdrawal Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await axios.get(`${API}/payments/history`);
      setPaymentHistory(response.data.transactions);
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  const loadPendingWithdrawals = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments/withdrawals`);
      setPendingWithdrawals(response.data.withdrawals);
    } catch (error) {
      console.error('Error loading pending withdrawals:', error);
    }
  };

  const approveWithdrawal = async (transactionId) => {
    try {
      await axios.post(`${API}/admin/payments/withdrawals/${transactionId}/approve`);
      addNotification('win', '✅ Withdrawal Approved', 'Payment has been processed');
      loadPendingWithdrawals();
    } catch (error) {
      addNotification('error', 'Approval Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const rejectWithdrawal = async (transactionId) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await axios.post(`${API}/admin/payments/withdrawals/${transactionId}/reject?reason=${encodeURIComponent(reason)}`);
      addNotification('info', '❌ Withdrawal Rejected', 'Balance has been refunded');
      loadPendingWithdrawals();
    } catch (error) {
      addNotification('error', 'Rejection Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  // Dice Game
  const playDice = async () => {
    if (diceRolling) return;
    
    setDiceRolling(true);
    setGameResult(null);
    
    try {
      const response = await axios.post(`${API}/games/dice/play`, diceGame);
      
      // Animation will complete and call this function
      setTimeout(() => {
        setGameResult(response.data);
        
        // Add notification
        if (response.data.result === 'win') {
          addNotification('win', '🎉 You Won!', `Roll: ${response.data.roll}`, response.data.payout);
        } else {
          addNotification('loss', '💸 You Lost', `Roll: ${response.data.roll}`, -diceGame.amount);
        }
        
        getUserInfo(); // Refresh user info
      }, 2000); // Match animation duration
      
    } catch (error) {
      setDiceRolling(false);
      addNotification('error', 'Game Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const onDiceAnimationComplete = () => {
    setDiceRolling(false);
  };

  // Mines Game
  const startMinesGame = async () => {
    try {
      const response = await axios.post(`${API}/games/mines/start`, {
        amount: minesGame.amount,
        mines_count: minesGame.mines_count
      });
      
      setMinesGame({
        ...minesGame,
        gameId: response.data.game_id,
        grid: Array(25).fill('hidden'),
        currentMultiplier: response.data.current_multiplier
      });
      
      addNotification('info', '🎮 Game Started', `${minesGame.mines_count} mines hidden in the grid`);
      getUserInfo(); // Refresh balance
    } catch (error) {
      addNotification('error', 'Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const revealMinesTile = async (position) => {
    if (!minesGame.gameId || minesGame.grid[position] !== 'hidden') return;
    
    try {
      const response = await axios.post(`${API}/games/mines/reveal?tile_position=${position}`, {}, {
        params: { game_id: minesGame.gameId }
      });
      
      const newGrid = [...minesGame.grid];
      
      if (response.data.result === 'mine') {
        // Game over - reveal all mines
        response.data.mines_positions.forEach(pos => {
          newGrid[pos] = 'mine';
        });
        newGrid[position] = 'mine-hit';
        
        setMinesGame({
          ...minesGame,
          grid: newGrid,
          gameId: null
        });
        
        addNotification('loss', '💥 Mine Hit!', 'Game over - try again!', -minesGame.amount);
        getUserInfo();
      } else {
        // Safe tile
        newGrid[position] = 'safe';
        setMinesGame({
          ...minesGame,
          grid: newGrid,
          currentMultiplier: response.data.current_multiplier
        });
        
        addNotification('win', '💎 Safe!', `Multiplier: ${response.data.current_multiplier.toFixed(2)}x`);
      }
    } catch (error) {
      addNotification('error', 'Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const cashoutMines = async () => {
    if (!minesGame.gameId) return;
    
    try {
      const response = await axios.post(`${API}/games/mines/cashout?game_id=${minesGame.gameId}`);
      
      setMinesGame({
        ...minesGame,
        gameId: null,
        grid: Array(25).fill('hidden')
      });
      
      addNotification('win', '💰 Cashed Out!', 
        `${response.data.multiplier.toFixed(2)}x multiplier`, 
        response.data.payout
      );
      getUserInfo(); // Refresh balance
    } catch (error) {
      addNotification('error', 'Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  // Crash Game
  const playCrash = async () => {
    try {
      setCrashGameState({ isPlaying: false, gameEnded: false });
      
      const response = await axios.post(`${API}/games/crash/play`, crashGame);
      
      if (response.data.result === 'manual') {
        // Start manual crash game simulation
        setCrashGame(prev => ({ ...prev, isPlaying: true, currentMultiplier: 1.0 }));
        setCrashGameState({ isPlaying: true, gameEnded: false });
        
        addNotification('info', '🚀 Crash Started', 'Watch the multiplier grow!');
        
        // Simulate crash game progression
        simulateCrashGame(response.data.crash_point);
      } else {
        // Auto cash out result
        setCrashGameState({ isPlaying: false, gameEnded: true });
        
        if (response.data.result === 'win') {
          addNotification('win', '🎉 Auto Win!', 
            `Cashed out at ${response.data.multiplier}x`, 
            response.data.payout
          );
        } else {
          addNotification('loss', '💥 Crashed!', 
            `Crashed at ${response.data.crash_point}x`, 
            -crashGame.amount
          );
        }
        getUserInfo();
        
        // Auto-reset after 3 seconds for new game
        setTimeout(() => {
          setCrashGameState({ isPlaying: false, gameEnded: false });
          setCrashGame(prev => ({ ...prev, currentMultiplier: 1.0 }));
        }, 3000);
      }
    } catch (error) {
      addNotification('error', 'Error', error.response?.data?.detail || 'Unknown error');
    }
  };

  const simulateCrashGame = (crashPoint) => {
    let currentMult = 1.0;
    const interval = setInterval(() => {
      currentMult += 0.02; // Slightly faster increment
      setCrashGame(prev => ({ ...prev, currentMultiplier: currentMult }));
      
      if (currentMult >= crashPoint) {
        clearInterval(interval);
        setCrashGameState({ isPlaying: false, gameEnded: true });
        setCrashGame(prev => ({ ...prev, isPlaying: false }));
        
        addNotification('loss', '💥 Crashed!', 
          `Crashed at ${crashPoint.toFixed(2)}x`, 
          -crashGame.amount
        );
        getUserInfo();
      }
    }, 100);
  };

  const manualCashOut = async () => {
    if (!crashGame.isPlaying) return;
    
    setCrashGame(prev => ({ ...prev, isPlaying: false }));
    setCrashGameState({ isPlaying: false, gameEnded: false });
    
    // Calculate payout based on current multiplier
    const payout = crashGame.amount * crashGame.currentMultiplier;
    
    addNotification('win', '💰 Manual Cash Out!', 
      `${crashGame.currentMultiplier.toFixed(2)}x multiplier`, 
      payout
    );
    
    getUserInfo();
    
    // Reset multiplier for new game
    setTimeout(() => {
      setCrashGame(prev => ({ ...prev, currentMultiplier: 1.0 }));
    }, 1000);
  };

  // Auto-reset function for crash game
  const handleCrashGameReset = () => {
    setCrashGameState({ isPlaying: false, gameEnded: false });
    setCrashGame(prev => ({ ...prev, currentMultiplier: 1.0, isPlaying: false }));
    addNotification('info', '🎮 Ready to Play', 'Place your bet for the next round!');
  };

  // Admin functions
  const loadAdminConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/config`);
      setAdminConfig(response.data);
      setConfigToUpdate(response.data);
    } catch (error) {
      alert('Error loading admin config: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const loadGameConfigs = async () => {
    try {
      const response = await axios.get(`${API}/admin/games/config`);
      setGameConfigs(response.data);
    } catch (error) {
      alert('Error loading game configs: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const loadAdminStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`);
      setAdminStats(response.data);
    } catch (error) {
      alert('Error loading admin stats: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const updateAdminConfig = async () => {
    try {
      await axios.post(`${API}/admin/config`, configToUpdate);
      addNotification('win', '⚙️ Configuration Updated', 'All changes have been saved');
      loadSiteConfig();
      loadAdminConfig();
    } catch (error) {
      addNotification('error', 'Update Error', error.response?.data?.detail || 'Unknown error');
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
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
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
                <span className="text-white animate-balance-update">Balance: ${user.balance?.toFixed(2) || '0.00'}</span>
                <button onClick={() => setCurrentPage('wallet')} className="text-white hover:text-yellow-400 transition-colors">Wallet</button>
                <button onClick={() => setCurrentPage('games')} className="text-white hover:text-yellow-400 transition-colors">Games</button>
                {user.is_admin && (
                  <button onClick={() => { setCurrentPage('admin'); loadAdminConfig(); loadGameConfigs(); loadAdminStats(); loadPendingWithdrawals(); }} className="text-white hover:text-yellow-400 transition-colors">Admin</button>
                )}
                <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-all">Logout</button>
              </>
            ) : (
              <button onClick={() => setCurrentPage('auth')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all">Login</button>
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
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Games</h1>
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-yellow-400">
            Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Dice Game */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur-md p-6 rounded-2xl border border-slate-700 game-card">
            <h2 className="text-3xl font-bold text-white mb-6 text-center flex items-center justify-center space-x-2">
              <span>🎲</span>
              <span>Dice Game</span>
            </h2>
            
            {/* Animated Dice */}
            <AnimatedDice 
              isRolling={diceRolling}
              result={gameResult?.roll || 50}
              target={diceGame.target}
              over={diceGame.over}
              onAnimationComplete={onDiceAnimationComplete}
            />
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Bet Amount</label>
                  <input
                    type="number"
                    value={diceGame.amount}
                    onChange={(e) => setDiceGame({...diceGame, amount: parseFloat(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="1"
                    max="1000"
                    disabled={diceRolling}
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Target Number</label>
                  <input
                    type="number"
                    value={diceGame.target}
                    onChange={(e) => setDiceGame({...diceGame, target: parseFloat(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="0.01"
                    max="99.99"
                    step="0.01"
                    disabled={diceRolling}
                    placeholder="0.00 - 99.99"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDiceGame({...diceGame, over: true})}
                  disabled={diceRolling}
                  className={`py-3 px-4 rounded-lg font-bold transition-all ${
                    diceGame.over 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-green-400 scale-105 shadow-lg shadow-green-500/30' 
                      : 'bg-slate-700 border-2 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  OVER {diceGame.target}
                </button>
                <button
                  onClick={() => setDiceGame({...diceGame, over: false})}
                  disabled={diceRolling}
                  className={`py-3 px-4 rounded-lg font-bold transition-all ${
                    !diceGame.over 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-400 scale-105 shadow-lg shadow-red-500/30' 
                      : 'bg-slate-700 border-2 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  UNDER {diceGame.target}
                </button>
              </div>
              
              <button
                onClick={playDice}
                disabled={diceRolling || diceGame.amount <= 0}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all border-2 ${
                  diceRolling 
                    ? 'bg-slate-600 border-slate-500 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-400 text-black hover:scale-105 hover:shadow-xl shadow-yellow-500/30'
                }`}
              >
                {diceRolling ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="spinner w-5 h-5"></div>
                    <span>Rolling...</span>
                  </div>
                ) : (
                  '🎲 ROLL DICE'
                )}
              </button>
            </div>
          </div>

          {/* Mines Game */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur-md p-6 rounded-2xl border border-slate-700 game-card">
            <h2 className="text-3xl font-bold text-white mb-6 text-center flex items-center justify-center space-x-2">
              <span>💣</span>
              <span>Mines Game</span>
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Bet Amount</label>
                  <input
                    type="number"
                    value={minesGame.amount}
                    onChange={(e) => setMinesGame({...minesGame, amount: parseFloat(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={minesGame.gameId}
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Mines Count</label>
                  <input
                    type="number"
                    value={minesGame.mines_count}
                    onChange={(e) => setMinesGame({...minesGame, mines_count: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="1"
                    max="24"
                    disabled={minesGame.gameId}
                    placeholder="1-24 mines"
                  />
                </div>
              </div>
              
              {!minesGame.gameId ? (
                <button
                  onClick={startMinesGame}
                  disabled={minesGame.amount <= 0}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 border-2 border-green-400 text-white py-4 rounded-xl text-xl font-bold hover:scale-105 transition-all hover:shadow-xl shadow-green-500/30"
                >
                  🚀 START GAME
                </button>
              ) : (
                <button
                  onClick={cashoutMines}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 border-2 border-yellow-400 text-black py-3 rounded-xl font-bold hover:scale-105 transition-all animate-pulse shadow-lg shadow-yellow-500/50"
                >
                  💰 CASH OUT {minesGame.currentMultiplier.toFixed(2)}x
                </button>
              )}
              
              {/* Animated Mines Grid */}
              <AnimatedMinesGrid 
                grid={minesGame.grid}
                onTileClick={revealMinesTile}
                gameId={minesGame.gameId}
                currentMultiplier={minesGame.currentMultiplier}
              />
            </div>
          </div>

          {/* Crash Game */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur-md p-6 rounded-2xl border border-slate-700 game-card">
            <h2 className="text-3xl font-bold text-white mb-6 text-center flex items-center justify-center space-x-2">
              <span>🚀</span>
              <span>Crash Game</span>
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Bet Amount</label>
                  <input
                    type="number"
                    value={crashGame.amount}
                    onChange={(e) => setCrashGame({...crashGame, amount: parseFloat(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={crashGameState.isPlaying}
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">Auto Cash Out</label>
                  <input
                    type="number"
                    value={crashGame.auto_cash_out || ''}
                    onChange={(e) => setCrashGame({...crashGame, auto_cash_out: e.target.value ? parseFloat(e.target.value) : null})}
                    className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 2.5x (optional)"
                    step="0.1"
                    disabled={crashGameState.isPlaying}
                  />
                </div>
              </div>
              
              {/* Animated Crash Component */}
              <AnimatedCrash 
                isPlaying={crashGameState.isPlaying}
                currentMultiplier={crashGame.currentMultiplier}
                onCashOut={manualCashOut}
                crashPoint={gameResult?.crash_point}
                gameEnded={crashGameState.gameEnded}
                onGameReset={handleCrashGameReset}
              />
              
              {!crashGameState.isPlaying && !crashGameState.gameEnded && (
                <button
                  onClick={playCrash}
                  disabled={crashGame.amount <= 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-400 text-white py-4 rounded-xl text-xl font-bold hover:scale-105 transition-all hover:shadow-xl shadow-blue-500/30"
                >
                  🚀 START CRASH
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-yellow-400">
            Back to Home
          </button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center">
            <h3 className="text-lg font-bold text-white">Total Users</h3>
            <p className="text-3xl font-bold text-yellow-400">{adminStats.total_users || 0}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center">
            <h3 className="text-lg font-bold text-white">Total Bets</h3>
            <p className="text-3xl font-bold text-blue-400">{adminStats.total_bets || 0}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center">
            <h3 className="text-lg font-bold text-white">Total Wagered</h3>
            <p className="text-3xl font-bold text-green-400">${(adminStats.total_wagered || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg text-center">
            <h3 className="text-lg font-bold text-white">House Profit</h3>
            <p className="text-3xl font-bold text-purple-400">${(adminStats.house_profit || 0).toFixed(2)}</p>
          </div>
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
            </div>
          </div>
        </div>

        <button
          onClick={updateAdminConfig}
          className="w-full mt-8 bg-green-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-700"
        >
          Save All Configuration
        </button>

        {/* Pending Withdrawals Section */}
        {user?.is_admin && (
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">💸 Pending Withdrawals</h2>
              <button 
                onClick={loadPendingWithdrawals}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
            
            {pendingWithdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Method</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-gray-700">
                        <td className="p-2">{withdrawal.user_id}</td>
                        <td className="p-2">${withdrawal.amount.toFixed(2)}</td>
                        <td className="p-2 capitalize">{withdrawal.metadata?.payment_method || 'N/A'}</td>
                        <td className="p-2">{new Date(withdrawal.created_at).toLocaleDateString()}</td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveWithdrawal(withdrawal.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(withdrawal.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-300 text-center py-8">No pending withdrawals</p>
            )}
          </div>
        )}
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
      case 'wallet':
        return renderWallet();
      default:
        return renderHome();
    }
  };

  const renderWallet = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Wallet</h1>
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-yellow-400">
            Back to Home
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Current Balance</h2>
          <p className="text-5xl font-bold text-yellow-400 animate-balance-update">${user?.balance?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deposit Section */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-6">💰 Deposit Money</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Amount to Deposit</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value))}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  min="10"
                  max="10000"
                  step="10"
                />
              </div>
              
              <div className="flex gap-2">
                {[50, 100, 200, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              
              <button
                onClick={createDeposit}
                className="w-full bg-green-600 text-white py-3 rounded-lg text-xl font-bold hover:bg-green-700"
              >
                Deposit via MercadoPago
              </button>
              
              <p className="text-gray-300 text-sm">
                Secure payment via MercadoPago. Supports credit cards, bank transfers, and PIX.
              </p>
            </div>
          </div>

          {/* Withdrawal Section */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-6">🏦 Withdraw Money</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Amount to Withdraw</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
                  className="w-full p-3 rounded bg-white bg-opacity-20 text-white"
                  min="20"
                  max={user?.balance || 0}
                  step="10"
                />
              </div>
              
              <div>
                <label className="block text-white mb-2">Payment Method</label>
                <select className="w-full p-3 rounded bg-white bg-opacity-20 text-white">
                  <option value="pix">PIX (Instant)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              
              <button
                onClick={requestWithdrawal}
                className="w-full bg-yellow-600 text-white py-3 rounded-lg text-xl font-bold hover:bg-yellow-700"
                disabled={!user?.balance || user.balance < withdrawAmount}
              >
                Request Withdrawal
              </button>
              
              <p className="text-gray-300 text-sm">
                Withdrawals are processed within 24 hours after admin approval.
              </p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-lg mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">📋 Payment History</h2>
            <button 
              onClick={loadPaymentHistory}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          
          {paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-700">
                      <td className="p-2 capitalize">{transaction.type}</td>
                      <td className="p-2">${transaction.amount.toFixed(2)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.status === 'completed' ? 'bg-green-600' :
                          transaction.status === 'pending' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="p-2">{new Date(transaction.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-300 text-center py-8">No payment history found</p>
          )}
        </div>
      </div>
    </div>
  );

  return renderCurrentPage();
};

export default App;