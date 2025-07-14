import React, { useState, useEffect } from 'react';

const AnimatedDice = ({ isRolling, result, onAnimationComplete }) => {
  const [currentNumber, setCurrentNumber] = useState(50);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setIsShaking(true);
      let rollCount = 0;
      const maxRolls = 20;
      
      const rollInterval = setInterval(() => {
        setCurrentNumber(Math.random() * 100);
        rollCount++;
        
        if (rollCount >= maxRolls) {
          clearInterval(rollInterval);
          setCurrentNumber(result);
          setIsShaking(false);
          setTimeout(() => {
            onAnimationComplete();
          }, 500);
        }
      }, 100);

      return () => clearInterval(rollInterval);
    }
  }, [isRolling, result, onAnimationComplete]);

  return (
    <div className="flex justify-center mb-6">
      <div className={`
        relative w-32 h-32 rounded-lg border-4 border-white bg-gradient-to-br from-blue-400 to-purple-600
        flex items-center justify-center text-white font-bold text-2xl shadow-lg
        ${isShaking ? 'animate-shake' : 'hover:scale-105'}
        transition-all duration-300
      `}>
        <div className={`transform transition-all duration-300 ${isShaking ? 'scale-110' : 'scale-100'}`}>
          {currentNumber.toFixed(2)}
        </div>
        
        {/* Decorative dots like a real dice */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
        <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-20 rounded-lg"></div>
      </div>
    </div>
  );
};

export default AnimatedDice;