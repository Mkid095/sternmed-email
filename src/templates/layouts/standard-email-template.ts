/**
 * Standard Email with Branding Template Layout
 *
 * Professional branded template for all outgoing emails with company header and footer
 */

export const standardEmailTemplate = {
  id: 'standard-email',
  name: 'Standard Email with Branding',
  description: 'Professional branded template for all outgoing emails with company header and footer',
  subject: '{{subject}}',
  bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
  <!-- Professional Header with Company Branding -->
  <div style="background: linear-gradient(135deg, #1a5f7a 0%, #2d8f9e 100%); padding: 40px 30px; text-align: center;">
    <div style="margin-bottom: 15px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
        Sternmed Afrika
      </h1>
      <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
        Medical Equipment Solutions
      </p>
    </div>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
      <p style="color: #bae6fd; margin: 0; font-size: 13px;">
        <a href="https://sternmedafrika.com" style="color: #ffffff; text-decoration: none; font-weight: 500;">sternmedafrika.com</a>
      </p>
    </div>
  </div>

  <!-- Email Content Body -->
  <div style="padding: 40px 30px; background-color: #ffffff;">
    <div style="line-height: 1.6; color: #374151; font-size: 15px;">
      {{content}}
    </div>
  </div>

  <!-- Professional Footer -->
  <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; padding-right: 20px;">
          <h3 style="color: #1a5f7a; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Contact Information</h3>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong style="color: #475569;">Email:</strong><br/>
            <a href="mailto:info@sternmedafrika.com" style="color: #0284c7; text-decoration: none;">info@sternmedafrika.com</a>
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong style="color: #475569;">Phone:</strong><br/>
            +254 700 000 000
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong style="color: #475569;">Website:</strong><br/>
            <a href="https://sternmedafrika.com" style="color: #0284c7; text-decoration: none;">www.sternmedafrika.com</a>
          </p>
        </td>
        <td style="vertical-align: top; padding-left: 20px; border-left: 1px solid #e2e8f0;">
          <h3 style="color: #1a5f7a; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Office</h3>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong style="color: #475569;">Sternmed Afrika Limited</strong><br/>
            P.O. Box [Your P.O. Box]<br/>
            Nairobi, Kenya
          </p>
          <p style="margin: 6px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            <strong style="color: #475569;">Business Hours:</strong><br/>
            Mon - Fri: 8:00 AM - 6:00 PM<br/>
            Sat: 9:00 AM - 2:00 PM
          </p>
        </td>
      </tr>
    </table>

    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
        &copy; {{current_date}} <strong style="color: #475569;">Sternmed Afrika Limited</strong>. All rights reserved.<br/>
        This email and any attachments are confidential and intended solely for the addressee.
      </p>
    </div>
  </div>
</div>`,
  bodyText: `Sternmed Afrika
Medical Equipment Solutions

---
{{content}}

---
Contact Information:
Email: info@sternmedafrika.com
Phone: +254 700 000 000
Website: https://sternmedafrika.com

Office:
Sternmed Afrika Limited
P.O. Box [Your P.O. Box]
Nairobi, Kenya

Business Hours:
Mon - Fri: 8:00 AM - 6:00 PM
Sat: 9:00 AM - 2:00 PM

© {{current_date}} Sternmed Afrika Limited. All rights reserved.
This email and any attachments are confidential and intended solely for the addressee.`,
  category: 'general',
  isDefault: true,
}
