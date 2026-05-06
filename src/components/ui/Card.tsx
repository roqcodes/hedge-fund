'use client';
import React from 'react';

interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ 
  title, 
  subtitle, 
  extra, 
  children, 
  className = '',
  noPadding = false 
}: CardProps) {
  return (
    <div className={`card ${className} animate-in`}>
      {(title || extra) && (
        <div className="card-header">
          <div className="card-title-group">
            {title && (typeof title === 'string' ? <h3>{title}</h3> : title)}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      <div className="card-body" style={noPadding ? { padding: 0 } : {}}>
        {children}
      </div>
    </div>
  );
}
