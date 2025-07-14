import React, { useState, useEffect, useRef } from 'react';

const AnimatedCrash = ({ 
  isPlaying, 
  currentMultiplier, 
  onCashOut, 
  crashPoint, 
  gameEnded 
}) => {
  const canvasRef = useRef(null);
  const [particles, setParticles] = useState([]);

  // Create crash explosion effect
  const createExplosion = () => {
    const newParticles = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x: Math.random() * 300,
        y: Math.random() * 200,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: `hsl(${Math.random() * 60}, 100%, 50%)`
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
          life: p.life - 0.02
        })).filter(p => p.life > 0)
      );
    };
    
    const interval = setInterval(animateParticles, 50);
    setTimeout(() => clearInterval(interval), 1500);
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    if (isPlaying) {
      // Draw curve
      ctx.strokeStyle = currentMultiplier > 2 ? '#10b981' : currentMultiplier > 1.5 ? '#f59e0b' : '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const points = 50;
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const progress = i / points;
        const mult = 1 + progress * (currentMultiplier - 1);
        const y = height - (mult - 1) * height / 5; // Scale for visibility
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Draw current point
      const currentX = width * 0.8;
      const currentY = height - (currentMultiplier - 1) * height / 5;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow effect
      ctx.shadowColor = currentMultiplier > 2 ? '#10b981' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Draw particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    
  }, [isPlaying, currentMultiplier, particles]);

  return (
    <div className="relative">
      {/* Graph Canvas */}
      <div className="relative bg-gray-900 rounded-lg p-4 mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className="w-full h-48 rounded"
        />
        
        {/* Multiplier Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`
            text-6xl font-bold transition-all duration-300
            ${isPlaying 
              ? currentMultiplier > 2 
                ? 'text-green-400 animate-pulse-fast' 
                : 'text-white'
              : gameEnded 
                ? 'text-red-500 animate-bounce' 
                : 'text-gray-400'
            }
            ${currentMultiplier > 5 ? 'animate-shake' : ''}
          `}>
            {gameEnded && crashPoint ? `${crashPoint}x` : `${currentMultiplier.toFixed(2)}x`}
          </div>
        </div>
        
        {/* Crashed overlay */}
        {gameEnded && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="text-4xl font-bold text-red-500 animate-bounce">
              CRASHED! 💥
            </div>
          </div>
        )}
      </div>
      
      {/* Cash Out Button */}
      {isPlaying && !gameEnded && (
        <button
          onClick={onCashOut}
          className={`
            w-full py-4 rounded-lg font-bold text-xl transition-all duration-300
            ${currentMultiplier > 2 
              ? 'bg-green-500 hover:bg-green-600 animate-pulse text-white' 
              : 'bg-yellow-500 hover:bg-yellow-600 text-black'
            }
            transform hover:scale-105 active:scale-95
          `}
        >
          CASH OUT {currentMultiplier.toFixed(2)}x
        </button>
      )}
      
      {/* Waiting for next round */}
      {!isPlaying && !gameEnded && (
        <div className="text-center py-4">
          <div className="text-gray-400 animate-pulse">Waiting for next round...</div>
        </div>
      )}
    </div>
  );
};

export default AnimatedCrash;