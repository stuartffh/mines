import React, { useState, useEffect, useRef } from 'react';

const AnimatedCrash = ({ 
  isPlaying, 
  currentMultiplier, 
  onCashOut, 
  crashPoint, 
  gameEnded,
  onGameReset 
}) => {
  const canvasRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const [showCrashEffect, setShowCrashEffect] = useState(false);

  // Auto-reset after crash
  useEffect(() => {
    if (gameEnded && crashPoint) {
      setShowCrashEffect(true);
      
      // Reset game after 3 seconds
      const resetTimer = setTimeout(() => {
        setShowCrashEffect(false);
        setParticles([]);
        if (onGameReset) {
          onGameReset();
        }
      }, 3000);
      
      return () => clearTimeout(resetTimer);
    }
  }, [gameEnded, crashPoint, onGameReset]);

  // Create crash explosion effect
  const createExplosion = () => {
    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        x: Math.random() * 400,
        y: Math.random() * 250,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1,
        color: `hsl(${Math.random() * 60}, 100%, ${50 + Math.random() * 30}%)`
      });
    }
    setParticles(newParticles);
    
    // Animate particles
    const animateParticles = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * 0.98,
          vy: p.vy * 0.98,
          life: p.life - 0.03
        })).filter(p => p.life > 0)
      );
    };
    
    const interval = setInterval(animateParticles, 50);
    setTimeout(() => clearInterval(interval), 2000);
  };

  useEffect(() => {
    if (gameEnded && crashPoint) {
      createExplosion();
    }
  }, [gameEnded, crashPoint]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    if (isPlaying || gameEnded) {
      // Draw curve
      const mult = gameEnded ? crashPoint : currentMultiplier;
      ctx.strokeStyle = gameEnded ? '#ef4444' : mult > 5 ? '#10b981' : mult > 2 ? '#f59e0b' : '#3b82f6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      const points = 100;
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const progress = i / points;
        const curveMult = 1 + progress * (mult - 1);
        const y = height - Math.min((curveMult - 1) * height / 8, height - 20);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Glow effect for line
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw current point
      if (isPlaying && !gameEnded) {
        const currentX = width * 0.85;
        const currentY = height - Math.min((currentMultiplier - 1) * height / 8, height - 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing effect
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    // Draw particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    
  }, [isPlaying, currentMultiplier, particles, gameEnded, crashPoint]);

  const getMultiplierColor = () => {
    if (gameEnded) return 'text-red-500';
    if (currentMultiplier > 10) return 'text-purple-400';
    if (currentMultiplier > 5) return 'text-green-400';
    if (currentMultiplier > 2) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getMultiplierSize = () => {
    if (gameEnded) return 'text-6xl';
    if (currentMultiplier > 5) return 'text-7xl';
    if (currentMultiplier > 2) return 'text-6xl';
    return 'text-5xl';
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700">
      {/* Graph Canvas */}
      <div className="relative bg-slate-900 rounded-lg p-4 mb-6 border border-slate-700">
        <canvas
          ref={canvasRef}
          width={400}
          height={250}
          className="w-full h-64 rounded"
        />
        
        {/* Multiplier Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`
            font-bold transition-all duration-300 font-mono
            ${getMultiplierColor()} ${getMultiplierSize()}
            ${isPlaying && !gameEnded ? 'animate-pulse-fast' : ''}
            ${currentMultiplier > 10 ? 'animate-shake' : ''}
            drop-shadow-lg
          `}>
            {gameEnded ? `${crashPoint?.toFixed(2)}x` : `${currentMultiplier.toFixed(2)}x`}
          </div>
        </div>
        
        {/* Crashed overlay with auto-hide */}
        {showCrashEffect && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex flex-col items-center justify-center animate-pulse">
            <div className="text-5xl font-bold text-red-400 animate-bounce mb-2">
              💥 CRASHED!
            </div>
            <div className="text-white text-lg">
              Restarting in 3 seconds...
            </div>
          </div>
        )}
        
        {/* Speed indicator */}
        {isPlaying && !gameEnded && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg px-3 py-1">
            <div className="text-white text-sm">
              Speed: {currentMultiplier > 5 ? '🚀 FAST' : currentMultiplier > 2 ? '⚡ MEDIUM' : '🐌 SLOW'}
            </div>
          </div>
        )}
        
        {/* Multiplier milestones */}
        {isPlaying && !gameEnded && (
          <div className="absolute top-4 left-4 space-y-1">
            {[2, 5, 10, 25].map(milestone => (
              <div 
                key={milestone}
                className={`text-xs px-2 py-1 rounded ${
                  currentMultiplier >= milestone 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {milestone}x
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Cash Out Button */}
        {isPlaying && !gameEnded && (
          <button
            onClick={onCashOut}
            className={`
              w-full py-4 rounded-xl font-bold text-xl transition-all duration-300 border-2
              ${currentMultiplier > 5 
                ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-400 text-white animate-pulse shadow-lg shadow-green-500/50' 
                : currentMultiplier > 2
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-400 text-black hover:scale-105'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 text-white hover:scale-105'
              }
              transform hover:scale-105 active:scale-95 hover:shadow-xl
            `}
          >
            💰 CASH OUT {currentMultiplier.toFixed(2)}x
          </button>
        )}
        
        {/* Waiting for next round */}
        {!isPlaying && !gameEnded && !showCrashEffect && (
          <div className="text-center py-6">
            <div className="text-slate-400 text-lg mb-2">Ready for next round</div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
            </div>
          </div>
        )}
        
        {/* Game statistics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
            <div className="text-slate-400 text-xs">LAST CRASH</div>
            <div className="text-white font-bold">
              {crashPoint ? `${crashPoint.toFixed(2)}x` : '--'}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
            <div className="text-slate-400 text-xs">CURRENT</div>
            <div className="text-white font-bold">
              {currentMultiplier.toFixed(2)}x
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
            <div className="text-slate-400 text-xs">STATUS</div>
            <div className={`font-bold text-xs ${
              gameEnded ? 'text-red-400' : 
              isPlaying ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {gameEnded ? 'CRASHED' : isPlaying ? 'FLYING' : 'WAITING'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedCrash;