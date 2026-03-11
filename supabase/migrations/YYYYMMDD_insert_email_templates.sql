-- Insert default email templates for Sternmed Afrika
-- These templates provide different scenarios for email communication

INSERT INTO email_templates (id, name, subject, body_html, body_text, category, is_system, created_at, updated_at) VALUES
(
  gen_random_uuid(),
  'Welcome Customer',
  'Welcome to Sternmed Afrika - Quality Medical Equipment',
  '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Sternmed Afrika</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">Quality Medical Equipment</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Welcome, {{customer_name}}!</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for choosing <strong style="color: #17487a;">Sternmed Afrika</strong>. We are excited to have you as a customer and look forward to serving your medical equipment needs.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      At Sternmed Afrika, we pride ourselves on providing:
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
        <strong>Email:</strong> info@sternmed.co.ke
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Phone:</strong> +254 700 000 000
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Website:</strong> <a href="https://sternmed.co.ke" style="color: #17487a;">www.sternmed.co.ke</a>
      </p>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Best regards,<br/>
      <strong>The Sternmed Afrika Team</strong>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>Sternmed Afrika Limited</strong><br/>
      Nairobi, Kenya<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>
  ',
  '
Welcome to Sternmed Afrika!

Thank you for choosing us. We are excited to have you as a customer.

At Sternmed Afrika, we pride ourselves on providing:
- High-quality medical equipment and supplies
- Expert technical support and training
- Competitive pricing and flexible financing
- Nationwide delivery and installation
- Comprehensive after-sales service

If you have any questions, our team is here to help.

Contact Us:
- Email: info@sternmed.co.ke
- Phone: +254 700 000 000
- Website: www.sternmed.co.ke

Best regards,
The Sternmed Afrika Team

---
Sternmed Afrika Limited
Nairobi, Kenya
© {{current_date}} All rights reserved.
  ',
  'welcome',
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Price Quote',
  'Price Quote from Sternmed Afrika - {{customer_name}}',
  '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Sternmed Afrika</h1>
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
          <!-- Add more rows as needed -->
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
      To accept this quotation or discuss further, please contact us at <a href="mailto:info@sternmed.co.ke" style="color: #17487a;">info@sternmed.co.ke</a> or call <strong>+254 700 000 000</strong>.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for your business.<br/>
      <strong>Sternmed Afrika Team</strong>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>Sternmed Afrika Limited</strong><br/>
      P.O. Box [XXXX-XXXXX], Nairobi, Kenya<br/>
      Email: info@sternmed.co.ke | Phone: +254 700 000 000<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>
  ',
  '
Dear {{customer_name}},

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

To accept this quotation or discuss further, please contact us at info@sternmed.co.ke or call +254 700 000 000.

Thank you for your business,
Sternmed Afrika Team

---
Sternmed Afrika Limited
Nairobi, Kenya
© {{current_date}} All rights reserved.
  ',
  'quote',
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Follow-up Email',
  'Following up - Sternmed Afrika',
  '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Sternmed Afrika</h1>
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
      At <strong style="color: #17487a;">Sternmed Afrika</strong>, we are committed to providing you with the best medical equipment solutions and exceptional service. Your satisfaction is our top priority.
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
        <strong>Email:</strong> info@sternmed.co.ke
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Phone:</strong> +254 700 000 000
      </p>
      <p style="margin: 5px 0; color: #374151; font-size: 14px;">
        <strong>Website:</strong> <a href="https://sternmed.co.ke" style="color: #17487a;">www.sternmed.co.ke</a>
      </p>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Looking forward to hearing from you.<br/>
      <strong>Best regards,</strong><br/>
      [Your Name]<br/>
      <span style="color: #17487a; font-weight: 600;">Sternmed Afrika</span>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>Sternmed Afrika Limited</strong><br/>
      Nairobi, Kenya<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>
  ',
  '
Hello {{customer_name}},

I hope this email finds you well. I wanted to follow up regarding our recent conversation about [specific topic].

Have you had an opportunity to review the information I shared? I would be happy to answer any questions you may have.

At Sternmed Afrika, we are committed to providing you with the best medical equipment solutions.

How can I assist you today?
- Answer questions about our products
- Schedule a demo or consultation
- Assist with order placement
- Provide technical support

Please feel free to reach out at your convenience.

Looking forward to hearing from you.

Best regards,
[Your Name]
Sternmed Afrika

---
Sternmed Afrika Limited
Nairobi, Kenya
© {{current_date}} All rights reserved.
  ',
  'follow-up',
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Thank You - Order Confirmation',
  'Thank you for your order - Sternmed Afrika',
  '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #17487a; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Sternmed Afrika</h1>
    <p style="color: #e5e7eb; margin: 10px 0 0; font-size: 14px;">Order Confirmation</p>
  </div>

  <div style="padding: 30px;">
    <h2 style="color: #17487a; margin-top: 0; font-size: 22px;">Thank you, {{customer_name}}!</h2>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      We sincerely thank you for your trust and for placing your order with <strong style="color: #17487a;">Sternmed Afrika</strong>. Your order has been successfully received and is now being processed.
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
        <strong>Need assistance?</strong> Contact us at +254 700 000 000 or reply to this email. We{{'\''}}re here to help!
      </p>
    </div>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Once again, thank you for choosing Sternmed Afrika. We value your business and look forward to serving you.
    </p>

    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Warm regards,<br/>
      <strong>The Sternmed Afrika Team</strong>
    </p>
  </div>

  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
      <strong>Sternmed Afrika Limited</strong><br/>
      Nairobi, Kenya<br/>
      Email: info@sternmed.co.ke | Phone: +254 700 000 000<br/>
      &copy; {{current_date}} All rights reserved.
    </p>
  </div>
</div>
  ',
  '
Dear {{customer_name}},

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

Need assistance? Contact us at +254 700 000 000 or reply to this email.

Thank you for choosing Sternmed Afrika!

Best regards,
The Sternmed Afrika Team

---
Sternmed Afrika Limited
Nairobi, Kenya
© {{current_date}} All rights reserved.
  ',
  'thank-you',
  true,
  NOW(),
  NOW()
);