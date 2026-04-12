'use client'

import { useState, useCallback } from 'react'


declare global {
  interface Window {
    Razorpay: any
  }
}

export function RazorpayCheckout({
  planId,
  planName,
  userName,
  userEmail,
  onSuccess,
  onError,
  disabled,
  children,
  className,
  style,
}: {
  planId: string
  planName: string
  userName?: string
  userEmail?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = useCallback(async () => {
    if (loading || disabled) return
    setLoading(true)

    try {
      // Step 1: Create subscription on backend
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      // Step 2: Load Razorpay checkout script if not already loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
          document.body.appendChild(script)
        })
      }

      // Step 3: Open Razorpay checkout
      const options = {
        key: data.razorpay_key,
        subscription_id: data.subscription_id,
        name: 'Clarvo AI',
        description: `${planName} Subscription`,
        image: '/icon-192.png',
        prefill: {
          name: userName || '',
          email: userEmail || '',
        },
        theme: {
          color: '#6C63FF',
        },
        handler: async (response: any) => {
          // Step 4: Verify payment
          try {
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            if (verifyRes.ok) {
              onSuccess?.()
            } else {
              const err = await verifyRes.json()
              onError?.(err?.error || 'Payment verification failed')
            }
          } catch {
            onError?.('Payment verification failed')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (response: any) => {
        onError?.(response.error?.description || 'Payment failed')
        setLoading(false)
      })
      razorpay.open()
    } catch (error: any) {
      onError?.(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [planId, planName, userName, userEmail, onSuccess, onError, loading, disabled])

  return (
    <button
      onClick={handleCheckout}
      disabled={loading || disabled}
      className={className}
      style={{
        ...style,
        opacity: loading || disabled ? 0.7 : 1,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'Processing...' : children}
    </button>
  )
}

export function CancelSubscription({
  onSuccess,
  onError,
  children,
  className,
  style,
}: {
  onSuccess?: () => void
  onError?: (error: string) => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      onSuccess?.()
    } catch (error: any) {
      onError?.(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }, [confirming, onSuccess, onError])

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={handleCancel}
          disabled={loading}
          className={className}
          style={{
            ...style,
            background: '#ef4444',
            color: '#fff',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Cancelling...' : 'Yes, cancel'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Keep plan
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className={className}
      style={style}
    >
      {children}
    </button>
  )
}
