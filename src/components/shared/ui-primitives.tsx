'use client'

import { forwardRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'

// ========== Button ==========

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const buttonSizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

const buttonVariantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-primary)]',
  primary:
    'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] border border-transparent',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90 border border-transparent',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className, disabled, ...rest }, ref) => {
    const base = 'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]'
    const disabledCls = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${buttonSizeClasses[size]} ${buttonVariantClasses[variant]} ${disabledCls} ${className ?? ''}`}
        {...rest}
      />
    )
  },
)
Button.displayName = 'Button'

// ========== IconButton ==========

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  tooltip?: string
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const iconBtnSizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, active, disabled, size = 'sm', className, ...rest }, ref) => {
    const base = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]'
    const stateCls = active
      ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] border border-[var(--accent-color)]/50'
      : disabled
        ? 'text-[var(--text-muted)] cursor-not-allowed opacity-50'
        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer'

    return (
      <button
        ref={ref}
        disabled={disabled}
        title={tooltip}
        aria-label={tooltip}
        className={`${base} ${iconBtnSizeClasses[size]} ${stateCls} ${className ?? ''}`}
        {...rest}
      >
        {icon}
      </button>
    )
  },
)
IconButton.displayName = 'IconButton'

// ========== Input ==========

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const inputSizeClasses: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-3 text-base',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, size = 'md', className, type = 'text', id, ...rest }, ref) => {
    const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs text-[var(--text-secondary)] font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent-color)] ${inputSizeClasses[size]} ${className ?? ''}`}
          {...rest}
        />
      </div>
    )
  },
)
Input.displayName = 'Input'

// ========== Select ==========

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  options: SelectOption[]
  size?: 'sm' | 'md' | 'lg'
}

const selectSizeClasses: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-3 text-base',
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, size = 'md', className, id, ...rest }, ref) => {
    const selectId = id ?? (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs text-[var(--text-secondary)] font-medium">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-color)] cursor-pointer ${selectSizeClasses[size]} ${className ?? ''}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  },
)
Select.displayName = 'Select'

// ========== Panel ==========

export interface PanelProps {
  title?: string
  collapsible?: boolean
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function Panel({ title, collapsible = false, defaultOpen = true, children, className }: PanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] overflow-hidden ${className ?? ''}`}
    >
      {title && (
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={collapsible ? () => setOpen((v) => !v) : undefined}
          role={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? open : undefined}
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          {collapsible && (
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              className={`text-[var(--text-muted)] transition-transform ${open ? '' : '-rotate-90'}`}
            >
              <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      {(!collapsible || open) && <div className="p-3">{children}</div>}
    </div>
  )
}
