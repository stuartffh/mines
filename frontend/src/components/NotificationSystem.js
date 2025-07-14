import React, { useState, useEffect } from 'react';

const NotificationSystem = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            transform transition-all duration-500 ease-in-out
            max-w-sm p-4 rounded-lg shadow-lg backdrop-blur-md border
            ${notification.type === 'win' 
              ? 'bg-green-500 bg-opacity-90 border-green-400 text-white' 
              : notification.type === 'loss'
              ? 'bg-red-500 bg-opacity-90 border-red-400 text-white'
              : notification.type === 'info'
              ? 'bg-blue-500 bg-opacity-90 border-blue-400 text-white'
              : 'bg-yellow-500 bg-opacity-90 border-yellow-400 text-black'
            }
            animate-slide-in-right
          `}
          style={{
            animation: `slideInRight 0.5s ease-out, fadeOut 0.5s ease-in ${notification.duration - 500}ms forwards`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {notification.type === 'win' ? '🎉' : 
               notification.type === 'loss' ? '💸' : 
               notification.type === 'info' ? 'ℹ️' : '⚠️'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg">{notification.title}</div>
              <div className="text-sm opacity-90">{notification.message}</div>
              {notification.amount && (
                <div className="text-lg font-bold mt-1">
                  {notification.type === 'win' ? '+' : '-'}${Math.abs(notification.amount).toFixed(2)}
                </div>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-white hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;