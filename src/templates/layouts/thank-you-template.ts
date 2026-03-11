/**
 * Thank You / Order Confirmation Email Template Layout
 *
 * Professional order confirmation and thank you email
 */

export const thankYouTemplate = {
  id: 'thank-you',
  name: 'Thank You - Order Confirmation',
  description: 'Send after a customer places an order',
  subject: 'Thank you for your order - {{company_name}}',
  bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{company_name}}</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">Order Confirmation</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Thank you, {{customer_name}}!</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      We sincerely thank you for your trust and for placing your order with <strong style="color: #17487a;">{{company_name}}</strong>. Your order has been successfully received and is now being processed.
    </p>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #bae6fd;">
      <h3 style="color: #0369a1; margin: 0 0 15px; font-size: 16px;">Order Details</h3>
      <p style="margin: 8px 0; color: #374151; font-size: 14px;">
        <strong>Order Number:</strong> #[Order-Number]
      </p>
      <p style="margin: 8px 0; color: #374151; font-size: 14px;">
        <strong>Date:</strong> {{current_date}}
      </p>
      <p style="margin: 8px 0; color: #374151; font-size: 14px;">
        <strong>Status:</strong> <span style="color: #16a34a; font-weight: 600;">Processing</span>
      </p>
    </div>

    <h3 style="color: #17487a; font-size: 18px; margin: 25px 0 10px;">What happens next?</h3>
    <ol style="color: #374151; font-size: 15px; line-height: 1.8; padding-left: 20px;">
      <li>Our team will review your order and prepare your items.</li>
      <li>You will receive an email notification when your order ships.</li>
      <li>Delivery typically takes 3-7 business days within Nairobi.</li>
      <li>Upon delivery, our technician will assist with setup and training if required.</li>
    </ol>

    <div style="background-color: #fefce8; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Need assistance?</strong> Contact us at {{company_phone}} or reply to this email. We're here to help!
      </p>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Once again, thank you for choosing {{company_name}}. We value your business and look forward to serving you.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Warm regards,<br/>
      <strong>The {{company_name}} Team</strong>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>{{company_name}} Limited</strong><br/>
      {{company_address}}<br/>
      Email: {{company_email}} | Phone: {{company_phone}}<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>`,
  bodyText: `Dear {{customer_name}},

Thank you for your order! We are pleased to confirm that your order has been received and is being processed.

ORDER DETAILS
--------------
Order Number: #[Order-Number]
Date: {{current_date}}
Status: Processing

NEXT STEPS
----------
1. Our team will review and prepare your items
2. You will receive a shipping notification via email
3. Delivery: 3-7 business days (Nairobi area)
4. Upon delivery, we will assist with setup if needed

Need assistance? Contact us at {{company_phone}} or reply to this email.

Thank you for choosing {{company_name}}!

Best regards,
The {{company_name}} Team

---
{{company_name}} Limited
{{company_address}}
© {{current_date}} All rights reserved.`,
  category: 'orders',
  isDefault: true,
}
