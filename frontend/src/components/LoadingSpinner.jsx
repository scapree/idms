import React from 'react'

const LoadingSpinner = ({ text = 'Загрузка...', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-3">
        <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 ${sizeClasses[size]}`}></div>
        {text && <span className="text-sm text-gray-500 font-medium">{text}</span>}
      </div>
    </div>
  )
}

export default LoadingSpinner
