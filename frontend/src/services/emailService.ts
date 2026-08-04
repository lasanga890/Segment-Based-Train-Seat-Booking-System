// EmailJS Service configuration
export const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_x1z7q8p'
export const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
export const EMAILJS_RECEIPT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RECEIPT_TEMPLATE_ID || ''
export const EMAILJS_STATUS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_STATUS_TEMPLATE_ID || ''

export interface SendEmailOptions {
  to_email: string
  to_name: string
  subject: string
  message: string
  booking_id?: string
  train_name?: string
  route?: string
  travel_date?: string
  seats?: string
  total_fare?: string
  template_id?: string
}

/**
 * Sends an email notification using EmailJS REST API.
 */
export const sendEmailNotification = async (options: SendEmailOptions): Promise<boolean> => {
  if (!options.to_email || !options.to_email.trim() || !options.to_email.includes('@')) {
    console.log('Email notification skipped: No valid passenger email provided.')
    return false
  }

  const publicKey = EMAILJS_PUBLIC_KEY
  const templateId = options.template_id || EMAILJS_RECEIPT_TEMPLATE_ID || EMAILJS_STATUS_TEMPLATE_ID

  if (!publicKey || !templateId) {
    console.warn('EmailJS notification skipped: VITE_EMAILJS_PUBLIC_KEY or VITE_EMAILJS_RECEIPT_TEMPLATE_ID is not configured yet.')
    return false
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: options.to_email,
          to_name: options.to_name,
          subject: options.subject,
          message: options.message,
          booking_id: options.booking_id || '',
          train_name: options.train_name || '',
          route: options.route || '',
          travel_date: options.travel_date || '',
          seats: options.seats || '',
          total_fare: options.total_fare || '',
        },
      }),
    })

    if (res.ok) {
      console.log(`Email successfully sent to ${options.to_email}`)
      return true
    } else {
      const err = await res.text()
      console.error('EmailJS send error:', err)
      return false
    }
  } catch (err) {
    console.error('Failed to send email via EmailJS:', err)
    return false
  }
}
