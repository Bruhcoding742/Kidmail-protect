import React from "react";

interface ShieldIconProps {
  className?: string;
  size?: number;
}

export default function ShieldIcon({ className = "", size = 24 }: ShieldIconProps) {
  return (
    <div 
      className={`relative inline-block ${className}`} 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        backgroundColor: '#1976d2',
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: `${size * 0.17}px`,
          left: `${size * 0.17}px`,
          right: `${size * 0.17}px`,
          bottom: `${size * 0.17}px`,
          backgroundColor: 'white',
          clipPath: 'polygon(50% 10%, 85% 30%, 85% 70%, 50% 90%, 15% 70%, 15% 30%)'
        }}
      ></div>
    </div>
  );
}
