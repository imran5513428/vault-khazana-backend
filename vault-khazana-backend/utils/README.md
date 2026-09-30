# 🏪 Vault Khazana Backend API

Production-ready Node.js + Express backend for **Vault Khazana** e-commerce platform - packaging and disposable items for restaurants, cafés, bakeries, and businesses in Pakistan.

**Frontend:** [vault-khazana-website](https://github.com/imran5513428/vault-khazana-website)

---

## ✨ Features

### 🛍️ E-Commerce
- Product catalog with categories, pricing, and custom printing
- Advanced search and filtering
- Shopping cart management
- Order creation and tracking

### 💳 Payments
- **Stripe** integration for card payments
- **JazzCash** integration for Pakistan mobile payments
- Cash on Delivery (COD) option
- Payment verification and receipts

### 👤 User Management
- User registration and authentication
- JWT token-based security
- Profile management
- Multiple shipping addresses
- Order history

### 📦 Order Management
- Order creation with automatic calculations (tax, shipping)
- Order status tracking
- Order cancellation and refunds
- Shipment tracking

### 📊 Admin Dashboard
- Sales analytics and reports
- Customer insights
- Inventory management
- Product management
- User management
- Payment analytics

### 📧 Email Notifications
- Order confirmation emails
- Shipping notifications
- Delivery confirmation
- Payment receipts
- Password reset emails

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime |
| **Express** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **JWT** | Authentication |
| **bcryptjs** | Password hashing |
| **Stripe** | Payment processing |
| **SendGrid** | Email service |
| **Multer** | File uploads |

---

## 📋 Requirements

- Node.js v14+ ([Download](https://nodejs.org/))
- MongoDB ([Atlas Free Tier](https://www.mongodb.com/cloud/atlas))
- Stripe Account ([Create](https://stripe.com/))
- SendGrid Account ([Create](https://sendgrid.com/))
- JazzCash Account (Optional, for Pakistan)

---

## 🚀 Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/imran5513428/vault-khazana-backend.git
cd vault-khazana-backend