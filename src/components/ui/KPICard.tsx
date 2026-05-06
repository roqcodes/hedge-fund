'use client';
import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  onClick?: () => void;
}

export default function KPICard({ 
  label, 
  value, 
  subValue, 
  trend, 
  icon, 
  color = 'var(--accent)', 
  bgColor = 'var(--accent-light)',
  onClick 
}: KPICardProps) {
  return (
    <div 
      className={`kpi-card-v2 ${onClick ? 'clickable' : ''}`} 
      onClick={onClick}
    >
      <div className="kpi-header">
        <div className="kpi-icon-container" style={{ backgroundColor: bgColor, color: color }}>
          {icon}
        </div>
        {trend && (
          <div className={`kpi-trend ${trend.isUp ? 'up' : 'down'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d={trend.isUp ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
            </svg>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      
      <div className="kpi-content">
        <span className="kpi-label-v2">{label}</span>
        <h3 className="kpi-value-v2" style={label.toLowerCase().includes('p&l') ? { color: value.toString().startsWith('+') ? 'var(--profit)' : value.toString().startsWith('-') ? 'var(--loss)' : 'inherit' } : {}}>
          {value}
        </h3>
        {subValue && <p className="kpi-sub-v2">{subValue}</p>}
      </div>
    </div>
  );
}
