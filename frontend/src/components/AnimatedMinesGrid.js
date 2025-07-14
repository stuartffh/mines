import React, { useState, useEffect } from 'react';

const AnimatedMinesGrid = ({ grid, onTileClick, gameId, currentMultiplier }) => {
  const [animatingTiles, setAnimatingTiles] = useState(new Set());
  const [revealedTiles, setRevealedTiles] = useState(new Set());

  const handleTileClick = (index) => {
    if (!gameId || grid[index] !== 'hidden' || animatingTiles.has(index)) return;
    
    setAnimatingTiles(prev => new Set(prev).add(index));
    
    setTimeout(() => {
      onTileClick(index);
      setRevealedTiles(prev => new Set(prev).add(index));
      setAnimatingTiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 300);
  };

  const getTileContent = (tile, index) => {
    if (tile === 'hidden') return '?';
    if (tile === 'safe') return '💎';
    if (tile === 'mine' || tile === 'mine-hit') return '💣';
    return '?';
  };

  const getTileClass = (tile, index) => {
    const baseClass = `
      aspect-square rounded-lg font-bold text-lg cursor-pointer
      transition-all duration-300 transform hover:scale-105
      flex items-center justify-center relative overflow-hidden
    `;
    
    if (animatingTiles.has(index)) {
      return baseClass + ' animate-pulse scale-110 bg-yellow-500';
    }
    
    if (tile === 'hidden') {
      return baseClass + ' bg-gray-600 hover:bg-gray-500 text-white shadow-lg';
    }
    
    if (tile === 'safe') {
      return baseClass + ' bg-green-600 text-white animate-bounce-once scale-105 shadow-lg';
    }
    
    if (tile === 'mine' || tile === 'mine-hit') {
      return baseClass + ' bg-red-600 text-white animate-explosion scale-105 shadow-lg';
    }
    
    return baseClass + ' bg-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* Multiplier Display */}
      {gameId && (
        <div className="text-center">
          <div className={`
            inline-block px-6 py-3 rounded-lg font-bold text-2xl
            bg-gradient-to-r from-yellow-400 to-orange-500 text-black
            transform transition-all duration-500
            ${currentMultiplier > 1 ? 'animate-pulse-slow scale-110' : 'scale-100'}
          `}>
            {currentMultiplier.toFixed(2)}x
          </div>
        </div>
      )}
      
      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 p-4 bg-black bg-opacity-30 rounded-lg">
        {grid.map((tile, index) => (
          <button
            key={index}
            onClick={() => handleTileClick(index)}
            disabled={!gameId || tile !== 'hidden'}
            className={getTileClass(tile, index)}
          >
            {/* Background effect for safe tiles */}
            {tile === 'safe' && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-lg"></div>
            )}
            
            {/* Background effect for mines */}
            {(tile === 'mine' || tile === 'mine-hit') && (
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-lg animate-pulse"></div>
            )}
            
            {/* Tile content */}
            <span className="relative z-10 text-xl">
              {getTileContent(tile, index)}
            </span>
            
            {/* Sparkle effect for safe tiles */}
            {tile === 'safe' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-twinkle"></div>
                <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full animate-twinkle-delayed"></div>
                <div className="absolute bottom-2 left-3 w-1 h-1 bg-white rounded-full animate-twinkle-slow"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnimatedMinesGrid;