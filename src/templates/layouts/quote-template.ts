/**
 * Price Quote Email Template Layout
 *
 * Professional price quotation template
 */

export const quoteTemplate = {
  id: 'quote',
  name: 'Price Quote',
  description: 'Send a professional price quotation to a customer',
  subject: 'Price Quote from {{company_name}} - {{customer_name}}',
  bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">{{company_name}}</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">Price Quotation</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Dear {{customer_name}},</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for your inquiry. Please find below your customized price quotation:
    </p>

    <div style="margin: 25px 0; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #17487a; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #17487a;">Item Description</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #17487a;">Qty</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #17487a;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #17487a;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">[Product/Service Name]</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">[Quantity]</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">KES [00,000]</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">KES [00,000]</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; color: #374151;">Subtotal:</td>
            <td style="padding: 12px; text-align: right; color: #374151;">KES [00,000]</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; color: #374151;">Tax (16% VAT):</td>
            <td style="padding: 12px; text-align: right; color: #374151;">KES [00,000]</td>
          </tr>
          <tr style="background-color: #e5e7eb;">
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #17487a;">TOTAL:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #17487a;">KES [00,000]</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Note:</strong> This quotation is valid for 30 days from the date of issue. Prices are subject to change without notice.
      </p>
    </div>

    <h3 style="color: #17487a; font-size: 18px; margin: 25px 0 10px;">Terms & Conditions</h3>
    <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px;">
      <li>50% deposit required to confirm order</li>
      <li>Balance due upon delivery</li>
      <li>Delivery within 7-14 business days after confirmation</li>
      <li>Warranty as per manufacturer terms</li>
    </ul>

    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 20px;">
      To accept this quotation or discuss further, please contact us at <a href="mailto:{{company_email}}" style="color: #17487a;">{{company_email}}</a> or call <strong>{{company_phone}}</strong>.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for your business.<br/>
      <strong>Sternmed Afrika Team</strong>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>{{company_name}} Limited</strong><br/>
      P.O. Box [XXXX-XXXXX], {{company_address}}<br/>
      Email: {{company_email}} | Phone: {{company_phone}}<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>`,
  bodyText: `Dear {{customer_name}},

Thank you for your inquiry. Please find below your price quotation:

[Product/Service Name] - [Quantity] x KES [00,000] = KES [00,000]

SUBTOTAL: KES [00,000]
Tax (16% VAT): KES [00,000]
-------------------------------
TOTAL: KES [00,000]

Note: This quotation is valid for 30 days.

Terms & Conditions:
- 50% deposit required to confirm order
- Balance due upon delivery
- Delivery within 7-14 business days
- Warranty as per manufacturer terms

To accept this quotation or discuss further, please contact us at {{company_email}} or call {{company_phone}}.

Thank you for your business,
Sternmed Afrika Team

---
{{company_name}} Limited
{{company_address}}
© {{current_date}} All rights reserved.`,
  category: 'sales',
  isDefault: true,
}
