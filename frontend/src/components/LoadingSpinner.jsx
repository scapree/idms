import React from 'react'

const LoadingSpinner = ({ text = 'Loading...', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-32 w-32'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`}></div>
        {text && <span className="text-gray-600 font-medium">{text}</span>}
      </div>
    </div>
  )
}

export default LoadingSpinner




