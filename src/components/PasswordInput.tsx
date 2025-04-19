import React, { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { validatePassword, getPasswordStrengthColor, type PasswordStrength } from '../lib/passwordUtils'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  showStrengthIndicator?: boolean
  autoComplete?: string
  className?: string
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter password',
  label = 'Password',
  error,
  showStrengthIndicator = false,
  autoComplete = 'current-password',
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const strength = validatePassword(value)
  const strengthColor = getPasswordStrengthColor(strength)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {showStrengthIndicator && (
        <div className="mt-2 space-y-1 text-sm">
          <p className={`flex items-center ${strength.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
            • Minimum 8 characters
          </p>
          <p className={`flex items-center ${strength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
            • At least one uppercase letter
          </p>
          <p className={`flex items-center ${strength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
            • At least one lowercase letter
          </p>
          <p className={`flex items-center ${strength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
            • At least one number
          </p>
          <p className={`flex items-center ${strength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
            • At least one special character
          </p>
          <div className="mt-2">
            <div className="text-sm font-medium">
              Password strength:{' '}
              <span className={strengthColor}>
                {strength.isValid ? 'Strong' : 'Weak'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PasswordInput 