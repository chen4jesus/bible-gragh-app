import { HTMLAttributes, forwardRef } from 'react'
import { theme } from '../../styles/theme'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'rounded-lg transition-shadow duration-200'
    
    const variants = {
      default: `bg-white ${theme.shadows.md}`,
      elevated: `bg-white ${theme.shadows.lg} hover:shadow-xl`,
      outlined: 'bg-white border border-gray-200 hover:border-gray-300',
    }

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
) 