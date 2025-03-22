import { ButtonHTMLAttributes, forwardRef } from 'react'
import { theme } from '../../styles/theme'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    const variants = {
      primary: `bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500`,
      secondary: `bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500`,
      outline: `border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500`,
      ghost: `bg-transparent hover:bg-gray-100 focus:ring-gray-500`,
      danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
) 