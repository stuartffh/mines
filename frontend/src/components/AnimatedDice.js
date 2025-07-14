import React, { useState, useEffect } from 'react';

const AnimatedDice = ({ isRolling, result, onAnimationComplete, target, over }) => {
  const [currentNumber, setCurrentNumber] = useState(50);
  const [isShaking, setIsShaking] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setIsShaking(true);
      setShowResult(false);
      let rollCount = 0;
      const maxRolls = 25;
      
      const rollInterval = setInterval(() => {
        setCurrentNumber(Math.random() * 100);
        rollCount++;
        
        if (rollCount >= maxRolls) {
          clearInterval(rollInterval);
          setCurrentNumber(result);
          setIsShaking(false);
          
          setTimeout(() => {
            setShowResult(true);
            onAnimationComplete();
          }, 500);
        }
      }, 80);

      return () => clearInterval(rollInterval);
    }
  }, [isRolling, result, onAnimationComplete]);

  const getResultColor = () => {
    if (!showResult) return 'text-white';
    
    const isWin = (over && result > target) || (!over && result < target);
    return isWin ? 'text-green-400' : 'text-red-400';
  };

  const getDiceSize = () => {
    if (isShaking) return 'scale-110';
    if (showResult) return 'scale-105';
    return 'scale-100';
  };

  return (
    <div className="flex flex-col items-center space-y-6 mb-6">
      {/* Target Display */}
      <div className="flex items-center space-x-4 bg-slate-800 rounded-xl px-6 py-3 border border-slate-700">
        <div className="text-slate-400 text-sm">Target:</div>
        <div className="font-bold text-xl text-white">{target}</div>
        <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
          over 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {over ? 'OVER' : 'UNDER'}
        </div>
      </div>

      {/* Dice Container */}
      <div className="relative">
        {/* Glow effect */}
        <div className={`
          absolute inset-0 rounded-2xl blur-xl transition-all duration-500
          ${isShaking ? 'bg-yellow-400 opacity-60' : 
            showResult ? (getResultColor().includes('green') ? 'bg-green-400 opacity-40' : 'bg-red-400 opacity-40') : 
            'bg-blue-400 opacity-20'}
        `}></div>
        
        {/* Main Dice */}
        <div className={`
          relative w-40 h-40 rounded-2xl border-4 border-white 
          bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700
          flex items-center justify-center text-white font-bold text-3xl 
          shadow-2xl transition-all duration-300 font-mono
          ${isShaking ? 'animate-shake' : 'hover:scale-105'}
          ${getDiceSize()}
          ${getResultColor()}
        `}>
          <div className={`
            transform transition-all duration-300 
            ${isShaking ? 'scale-110 rotate-12' : 'scale-100 rotate-0'}
          `}>
            {currentNumber.toFixed(2)}
          </div>
          
          {/* Decorative dots like a real dice */}
          <div className="absolute top-3 left-3 w-3 h-3 bg-white rounded-full opacity-70"></div>
          <div className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full opacity-70"></div>
          <div className="absolute bottom-3 left-3 w-3 h-3 bg-white rounded-full opacity-70"></div>
          <div className="absolute bottom-3 right-3 w-3 h-3 bg-white rounded-full opacity-70"></div>
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-50"></div>
          
          {/* Shine effect */}
          <div className="absolute inset-2 bg-gradient-to-tr from-white to-transparent opacity-20 rounded-xl"></div>
          
          {/* Result indicator */}
          {showResult && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className={`
                px-4 py-2 rounded-lg text-sm font-bold animate-bounce
                ${getResultColor().includes('green') 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
                }
              `}>
                {(over && result > target) || (!over && result < target) ? 'WIN!' : 'LOSE!'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roll Progress */}
      {isRolling && (
        <div className="w-full max-w-xs">
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full animate-pulse"></div>
          </div>
          <div className="text-center text-slate-400 text-sm mt-2">Rolling...</div>
        </div>
      )}

      {/* Result Details */}
      {showResult && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 min-w-64">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide">Result</div>
              <div className="text-2xl font-bold text-white">{result.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide">Target</div>
              <div className="text-2xl font-bold text-white">{target} ({over ? 'Over' : 'Under'})</div>
            </div>
          </div>
          
          {/* Visual result indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className={`
              w-4 h-4 rounded-full
              ${(over && result > target) || (!over && result < target) 
                ? 'bg-green-400 animate-pulse' 
                : 'bg-red-400 animate-pulse'
              }
            `}></div>
            <span className={`
              font-bold text-lg
              ${(over && result > target) || (!over && result < target) 
                ? 'text-green-400' 
                : 'text-red-400'
              }
            `}>
              {(over && result > target) || (!over && result < target) ? 'YOU WIN!' : 'YOU LOSE!'}
            </span>
          </div>
        </div>
      )}

      {/* Probability Display */}
      {!isRolling && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wide text-center mb-2">Win Probability</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-slate-700 rounded-full h-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  over ? 'bg-green-400' : 'bg-red-400'
                }`}
                style={{ 
                  width: `${over ? (99.99 - target) : target}%` 
                }}
              ></div>
            </div>
            <div className="text-white font-bold text-sm min-w-16">
              {over ? (99.99 - target).toFixed(1) : target.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedDice;