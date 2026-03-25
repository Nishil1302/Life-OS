import React from 'react'
import { cn } from '../../lib/utils'

// ─── Button ──────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-glow-sm',
    ghost:   'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
    danger:  'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    outline: 'border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] backdrop-blur-md',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-muted)]">{label}</label>}
      <input className={cn('input', error && 'border-red-500/50 focus:border-red-500', className)} {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ─── Textarea ────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-muted)]">{label}</label>}
      <textarea className={cn('input resize-none', className)} {...props} />
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-muted)]">{label}</label>}
      <select className={cn('input', className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; color?: string; className?: string }

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn('badge', className)}
      style={color ? { backgroundColor: `${color}18`, color, border: `1px solid ${color}30` } : undefined}
    >
      {children}
    </span>
  )
}

// ─── Progress ────────────────────────────────────────────────
interface ProgressProps { value: number; color?: string; className?: string; showLabel?: boolean }

export function Progress({ value, color = '#6366f1', className, showLabel }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && <span className="text-xs text-[var(--text-subtle)] w-8 text-right">{pct}%</span>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div className={cn(
        'relative w-full max-w-md animate-slide-up flex flex-col max-h-[90vh]',
        'backdrop-blur-2xl bg-[var(--bg-overlay)] border border-[var(--border-color)]',
        'rounded-2xl shadow-[var(--shadow-float)]',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-subtle)]
                       hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-200 text-sm"
          >
            ✕
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────
interface EmptyProps { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }

export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      <div className="text-[var(--text-subtle)] opacity-60">{icon}</div>
      <div>
        <p className="text-[var(--text-muted)] font-medium text-sm">{title}</p>
        {description && <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin', className)} />
  )
}
