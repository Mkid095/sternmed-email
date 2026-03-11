/**
 * Follow-up Email Template Layout
 *
 * Professional follow-up email after initial contact
 */

export const followupTemplate = {
  id: 'followup',
  name: 'Follow-up',
  description: 'Follow up with a customer after initial contact',
  subject: 'Following up - {{company_name}}',
  bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{company_name}}</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">We are here to help</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Hello {{customer_name}},</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      I hope this email finds you well. I wanted to follow up regarding our recent conversation about <em>[specific topic, e.g., your equipment needs, the quotation we sent, etc.]</em>.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Have you had an opportunity to review the information I shared? I would be happy to answer any questions you may have or provide additional details to help with your decision-making process.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      At <strong style="color: #17487a;">{{company_name}}</strong>, we are committed to providing you with the best medical equipment solutions and exceptional service. Your satisfaction is our top priority.
    </p>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <h4 style="color: #0c4a6e; margin: 0 0 10px; font-size: 16px;">How can I assist you today?</h4>
      <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Answer questions about our products</li>
        <li>Schedule a demo or consultation</li>
        <li>Assist with order placement</li>
        <li>Provide technical support</li>
      </ul>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Please feel free to reach out at your convenience. You can reply to this email or contact me directly at:
    </p>

    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Email:</strong> {{company_email}}
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Phone:</strong> {{company_phone}}
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Website:</strong> <a href="{{website}}" style="color: #17487a;">{{website}}</a>
      </p>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Looking forward to hearing from you.<br/>
      <strong>Best regards,</strong><br/>
      [Your Name]<br/>
      <span style="color: #17487a; font-weight: 600;">{{company_name}}</span>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>{{company_name}} Limited</strong><br/>
      {{company_address}}<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>`,
  bodyText: `Hello {{customer_name}},

I hope this email finds you well. I wanted to follow up regarding our recent conversation about [specific topic].

Have you had an opportunity to review the information I shared? I would be happy to answer any questions you may have.

At {{company_name}}, we are committed to providing you with the best medical equipment solutions.

How can I assist you today?
- Answer questions about our products
- Schedule a demo or consultation
- Assist with order placement
- Provide technical support

Please feel free to reach out at your convenience.

Looking forward to hearing from you.

Best regards,
[Your Name]
{{company_name}}

---
{{company_name}} Limited
{{company_address}}
© {{current_date}} All rights reserved.`,
  category: 'follow-up',
  isDefault: true,
}
