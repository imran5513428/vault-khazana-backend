import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'orders@vaultkhazana.com';
const APP_NAME = process.env.APP_NAME || 'Vault Khazana';

// ========================
// SEND ORDER CONFIRMATION
// ========================

export const sendOrderConfirmation = async (order, user) => {
  try {
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Order Confirmation</h2>
          
          <p>Hello ${user.firstName},</p>
          
          <p>Thank you for your order! We're excited to get your items shipped out.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #D4AF37;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-PK')}</p>
            <p><strong>Total Amount:</strong> Rs ${order.total.toLocaleString('en-PK')}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
          </div>
          
          <h3 style="color: #0A2342;">Items Ordered:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #0A2342; color: white;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Quantity</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Subtotal</th>
            </tr>
            ${order.items.map(item => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">${item.productName}</td>
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">Rs ${item.pricePerUnit.toLocaleString('en-PK')}</td>
                <td style="padding: 10px; text-align: right;">Rs ${item.subtotal.toLocaleString('en-PK')}</td>
              </tr>
            `).join('')}
          </table>
          
          <h3 style="color: #0A2342;">Shipping Address:</h3>
          <p>
            ${order.shippingAddress.fullName}<br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}<br>
            ${order.shippingAddress.country}
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #D4AF37;">Order Summary</h3>
            <p><strong>Subtotal:</strong> Rs ${order.subtotal.toLocaleString('en-PK')}</p>
            <p><strong>Shipping:</strong> Rs ${order.shippingCost.toLocaleString('en-PK')}</p>
            <p><strong>Tax (17% GST):</strong> Rs ${order.tax.toLocaleString('en-PK')}</p>
            <p style="font-size: 18px;"><strong>Total:</strong> Rs ${order.total.toLocaleString('en-PK')}</p>
          </div>
          
          <p>We'll send you a tracking number once your order ships.</p>
          
          <p>If you have any questions, please reply to this email or contact us at support@vaultkhazana.com</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Order confirmation email sent to', user.email);
  } catch (error) {
    console.error('Error sending order confirmation:', error);
  }
};

// ========================
// SEND SHIPPING NOTIFICATION
// ========================

export const sendShippingNotification = async (order, trackingNumber) => {
  try {
    const msg = {
      to: order.shippingAddress.email,
      from: FROM_EMAIL,
      subject: `Your Order is Shipped - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Your Order is On the Way!</h2>
          
          <p>Hello ${order.shippingAddress.fullName},</p>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #D4AF37;">Shipment Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Tracking Number:</strong> <span style="font-weight: bold; color: #0A2342;">${trackingNumber}</span></p>
            <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-PK') : 'Coming Soon'}</p>
          </div>
          
          <p>You can track your package using the tracking number above on our website.</p>
          
          <p>Delivery Address:<br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}
          </p>
          
          <p>If you have any questions, please contact us at support@vaultkhazana.com</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Shipping notification sent to', order.shippingAddress.email);
  } catch (error) {
    console.error('Error sending shipping notification:', error);
  }
};

// ========================
// SEND ORDER DELIVERY CONFIRMATION
// ========================

export const sendDeliveryConfirmation = async (order) => {
  try {
    const msg = {
      to: order.shippingAddress.email,
      from: FROM_EMAIL,
      subject: `Order Delivered - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Your Order Has Been Delivered! 🎉</h2>
          
          <p>Hello ${order.shippingAddress.fullName},</p>
          
          <p>Your order has been successfully delivered!</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Delivered On:</strong> ${new Date(order.deliveredAt).toLocaleDateString('en-PK')}</p>
            <p><strong>Total Amount Paid:</strong> Rs ${order.total.toLocaleString('en-PK')}</p>
          </div>
          
          <p>We hope you're satisfied with your purchase. If you have any feedback or concerns, please let us know.</p>
          
          <p><a href="https://imran5513428.github.io/vault-khazana-website/#/account/orders" style="background-color: #D4AF37; color: #0A2342; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Order</a></p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Delivery confirmation sent to', order.shippingAddress.email);
  } catch (error) {
    console.error('Error sending delivery confirmation:', error);
  }
};

// ========================
// SEND ORDER CANCELLATION
// ========================

export const sendCancellationNotification = async (order, reason) => {
  try {
    const msg = {
      to: order.shippingAddress.email,
      from: FROM_EMAIL,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Order Cancelled</h2>
          
          <p>Hello ${order.shippingAddress.fullName},</p>
          
          <p>Your order has been cancelled as requested.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Cancellation Reason:</strong> ${reason}</p>
            <p><strong>Refund Amount:</strong> Rs ${order.total.toLocaleString('en-PK')}</p>
          </div>
          
          <p>Your refund will be processed within 5-7 business days. You'll receive a confirmation email once the refund is completed.</p>
          
          <p>If you have any questions, please contact us at support@vaultkhazana.com</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Cancellation notification sent to', order.shippingAddress.email);
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
  }
};

// ========================
// SEND PAYMENT RECEIPT
// ========================

export const sendPaymentReceipt = async (payment, order, user) => {
  try {
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: `Payment Receipt - ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Payment Receipt</h2>
          
          <p>Hello ${user.firstName},</p>
          
          <p>Thank you for your payment!</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #D4AF37;">Payment Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Amount Paid:</strong> Rs ${payment.amount.toLocaleString('en-PK')}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod.toUpperCase()}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.completedAt).toLocaleDateString('en-PK')}</p>
            <p><strong>Status:</strong> ${payment.status}</p>
          </div>
          
          <p>Your order will be processed and shipped soon.</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Payment receipt sent to', user.email);
  } catch (error) {
    console.error('Error sending payment receipt:', error);
  }
};

// ========================
// SEND WELCOME EMAIL
// ========================

export const sendWelcomeEmail = async (user) => {
  try {
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Welcome to ${APP_NAME}!</h2>
          
          <p>Hello ${user.firstName} ${user.lastName},</p>
          
          <p>Welcome to ${APP_NAME}! We're thrilled to have you as part of our community.</p>
          
          <p>As a member, you can now:</p>
          <ul style="color: #333;">
            <li>Browse our exclusive packaging and disposable items</li>
            <li>Place orders with special business rates</li>
            <li>Track your orders in real-time</li>
            <li>Save your favorite products</li>
            <li>Enjoy custom printing services</li>
          </ul>
          
          <p><a href="https://imran5513428.github.io/vault-khazana-website/#/" style="background-color: #D4AF37; color: #0A2342; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Shopping</a></p>
          
          <p>If you have any questions, feel free to reach out to us at support@vaultkhazana.com</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Welcome email sent to', user.email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// ========================
// SEND PASSWORD RESET EMAIL
// ========================

export const sendPasswordResetEmail = async (user, resetLink) => {
  try {
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A2342;">Reset Your Password</h2>
          
          <p>Hello ${user.firstName},</p>
          
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          
          <p><a href="${resetLink}" style="background-color: #D4AF37; color: #0A2342; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          
          <p>This link will expire in 24 hours.</p>
          
          <p>If you didn't request this, please ignore this email.</p>
          
          <p style="color: #999; margin-top: 30px; font-size: 12px;">
            © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Password reset email sent to', user.email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};