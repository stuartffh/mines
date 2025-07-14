import React, { useState, useEffect } from 'react';

const AnimatedMinesGrid = ({ grid, onTileClick, gameId, currentMultiplier }) => {
  const [animatingTiles, setAnimatingTiles] = useState(new Set());
  const [revealedTiles, setRevealedTiles] = useState(new Set());
  const [hoveredTile, setHoveredTile] = useState(null);

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
      aspect-square rounded-xl font-bold text-xl cursor-pointer
      transition-all duration-300 transform
      flex items-center justify-center relative overflow-hidden
      border-2 select-none
    `;
    
    if (animatingTiles.has(index)) {
      return baseClass + ' animate-pulse scale-110 bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 shadow-lg shadow-yellow-500/50';
    }
    
    if (tile === 'hidden') {
      const isHovered = hoveredTile === index;
      return baseClass + ` 
        bg-gradient-to-br from-slate-600 to-slate-700 
        border-slate-500 text-white shadow-lg
        hover:from-slate-500 hover:to-slate-600 hover:border-slate-400
        hover:scale-105 hover:shadow-xl
        ${isHovered ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        ${gameId ? 'hover:shadow-blue-500/30' : 'cursor-not-allowed opacity-50'}
      `;
    }
    
    if (tile === 'safe') {
      return baseClass + ` 
        bg-gradient-to-br from-green-500 to-green-600 
        border-green-400 text-white animate-bounce-once 
        scale-105 shadow-lg shadow-green-500/50
      `;
    }
    
    if (tile === 'mine-hit') {
      return baseClass + ` 
        bg-gradient-to-br from-red-600 to-red-700 
        border-red-500 text-white animate-explosion 
        scale-105 shadow-lg shadow-red-500/50
      `;
    }
    
    if (tile === 'mine') {
      return baseClass + ` 
        bg-gradient-to-br from-red-500 to-red-600 
        border-red-400 text-white animate-pulse 
        scale-105 shadow-lg shadow-red-500/50
      `;
    }
    
    return baseClass + ' bg-slate-600';
  };

  const safeCount = grid.filter(tile => tile === 'safe').length;
  const mineCount = grid.filter(tile => tile === 'mine' || tile === 'mine-hit').length;

  return (
    <div className="space-y-6">
      {/* Game Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Multiplier</div>
          <div className={`
            text-2xl font-bold font-mono transition-all duration-500
            ${currentMultiplier > 5 ? 'text-purple-400 animate-pulse' : 
              currentMultiplier > 2 ? 'text-green-400' : 'text-blue-400'}
          `}>
            {currentMultiplier.toFixed(2)}x
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Safe Found</div>
          <div className="text-2xl font-bold text-green-400 font-mono">
            💎 {safeCount}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wide">Mines Hit</div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            💣 {mineCount}
          </div>
        </div>
      </div>

      {/* Multiplier Display */}
      {gameId && (
        <div className="text-center">
          <div className={`
            inline-block px-8 py-4 rounded-2xl font-bold text-3xl
            bg-gradient-to-r shadow-2xl transition-all duration-500 border-2
            ${currentMultiplier > 10 ? 'from-purple-500 to-pink-500 border-purple-400 animate-pulse scale-110 shadow-purple-500/50' :
              currentMultiplier > 5 ? 'from-green-500 to-emerald-500 border-green-400 animate-pulse-slow scale-105 shadow-green-500/50' :
              currentMultiplier > 2 ? 'from-yellow-500 to-orange-500 border-yellow-400 shadow-yellow-500/50' :
              'from-blue-500 to-cyan-500 border-blue-400 shadow-blue-500/50'}
            text-white
          `}>
            {currentMultiplier.toFixed(2)}x
          </div>
          
          {/* Risk indicator */}
          <div className="mt-2 text-sm text-slate-400">
            {currentMultiplier > 10 ? '🔥 EXTREME RISK' :
             currentMultiplier > 5 ? '⚡ HIGH RISK' :
             currentMultiplier > 2 ? '⚠️ MEDIUM RISK' :
             '✅ LOW RISK'}
          </div>
        </div>
      )}
      
      {/* Grid */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="grid grid-cols-5 gap-3">
          {grid.map((tile, index) => (
            <button
              key={index}
              onClick={() => handleTileClick(index)}
              onMouseEnter={() => setHoveredTile(index)}
              onMouseLeave={() => setHoveredTile(null)}
              disabled={!gameId || tile !== 'hidden'}
              className={getTileClass(tile, index)}
            >
              {/* Background glow for safe tiles */}
              {tile === 'safe' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-xl animate-pulse"></div>
              )}
              
              {/* Background glow for mines */}
              {(tile === 'mine' || tile === 'mine-hit') && (
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-xl animate-pulse"></div>
              )}
              
              {/* Hover effect for hidden tiles */}
              {tile === 'hidden' && hoveredTile === index && gameId && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl opacity-20"></div>
              )}
              
              {/* Tile content */}
              <span className="relative z-10 text-2xl drop-shadow-lg">
                {getTileContent(tile, index)}
              </span>
              
              {/* Sparkle effect for safe tiles */}
              {tile === 'safe' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-twinkle"></div>
                  <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full animate-twinkle-delayed"></div>
                  <div className="absolute bottom-2 left-3 w-1 h-1 bg-white rounded-full animate-twinkle-slow"></div>
                  <div className="absolute bottom-1 right-1 w-1 h-1 bg-white rounded-full animate-twinkle"></div>
                </div>
              )}
              
              {/* Index number for accessibility */}
              {tile === 'hidden' && (
                <div className="absolute bottom-0 right-0 text-xs text-slate-400 opacity-50">
                  {index + 1}
                </div>
              )}
            </button>
          ))}
        </div>
        
        {/* Grid instructions */}
        {gameId && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Click tiles to reveal. Find 💎 gems to increase your multiplier!
          </div>
        )}
        
        {/* Game over overlay */}
        {!gameId && mineCount > 0 && (
          <div className="mt-4 text-center">
            <div className="text-red-400 font-bold text-lg">Game Over!</div>
            <div className="text-slate-400 text-sm">You hit {mineCount} mine{mineCount > 1 ? 's' : ''}. Start a new game to try again.</div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded border border-slate-500 flex items-center justify-center text-white">?</div>
          <span className="text-slate-400">Hidden</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded border border-green-400 flex items-center justify-center">💎</div>
          <span className="text-slate-400">Safe</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded border border-red-400 flex items-center justify-center">💣</div>
          <span className="text-slate-400">Mine</span>
        </div>
      </div>
    </div>
  );
};

export default AnimatedMinesGrid;