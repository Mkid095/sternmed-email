/**
 * Welcome Email Template Layout
 *
 * Professional welcome email for new customers
 */

export const welcomeTemplate = {
  id: 'welcome',
  name: 'Welcome Customer',
  description: 'Send a warm welcome to new customers',
  subject: 'Welcome to {{company_name}}!',
  bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{company_name}}</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">Quality Medical Equipment</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Welcome, {{customer_name}}!</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for choosing <strong style="color: #17487a;">{{company_name}}</strong>. We are excited to have you as a customer and look forward to serving your medical equipment needs.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      At {{company_name}}, we pride ourselves on providing:
    </p>

    <ul style="color: #374151; font-size: 15px; line-height: 1.8; padding-left: 20px;">
      <li>High-quality medical equipment and supplies</li>
      <li>Expert technical support and training</li>
      <li>Competitive pricing and flexible financing</li>
      <li>Nationwide delivery and installation</li>
      <li>Comprehensive after-sales service</li>
    </ul>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      If you have any questions or need assistance, our dedicated team is here to help.
    </p>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #17487a; margin: 0 0 10px; font-size: 16px;">Contact Us</h3>
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
      Best regards,<br/>
      <strong>The {{company_name}} Team</strong>
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
  bodyText: `Welcome to {{company_name}}!

Thank you for choosing {{company_name}}. We are excited to have you as a customer.

At {{company_name}}, we pride ourselves on providing:
- High-quality medical equipment and supplies
- Expert technical support and training
- Competitive pricing and flexible financing
- Nationwide delivery and installation
- Comprehensive after-sales service

If you have any questions, our team is here to help.

Contact Us:
- Email: {{company_email}}
- Phone: {{company_phone}}
- Website: {{website}}

Best regards,
The {{company_name}} Team

---
{{company_name}} Limited
{{company_address}}
© {{current_date}} All rights reserved.`,
  category: 'general',
  isDefault: true,
}
