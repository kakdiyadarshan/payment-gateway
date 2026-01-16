require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Cashfree API Configuration
const CASHFREE_API_VERSION = "2023-08-01";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com";

// Create Order endpoint
app.post("/api/create-order", async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;

        if (!amount || !customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        const orderId = "order_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const customerId = "cust_" + Date.now();

        console.log("Creating order:", { orderId, amount });

        const orderPayload = {
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: "INR",
            customer_details: {
                customer_id: customerId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone
            }
        };

        const response = await axios.post(
            `${CASHFREE_BASE_URL}/pg/orders`,
            orderPayload,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": CASHFREE_API_VERSION
                }
            }
        );

        console.log("Order created successfully:", response.data);

        res.json({
            success: true,
            order_id: response.data.order_id,
            payment_session_id: response.data.payment_session_id,
            order_status: response.data.order_status
        });

    } catch (error) {
        console.error("Error creating order:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });
    }
});

// Process Payment endpoint (for custom UI payments)
app.post("/api/process-payment", async (req, res) => {
    try {
        const { order_id, payment_method, payment_data, payment_session_id } = req.body;

        if (!order_id || !payment_method || !payment_session_id) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
        }

        console.log("Processing payment:", { order_id, payment_method });

        let apiUrl;
        let payloadData;

        // Common endpoint for all payment methods in v3
        apiUrl = `${CASHFREE_BASE_URL}/pg/orders/sessions`;

        switch (payment_method) {
            case 'upi':
                payloadData = {
                    payment_session_id: payment_session_id,
                    payment_method: {
                        upi: {
                            channel: "collect",
                            upi_id: payment_data.upiId
                        }
                    }
                };
                break;

            case 'card':
                payloadData = {
                    payment_session_id: payment_session_id,
                    payment_method: {
                        card: {
                            channel: "link",
                            card_number: payment_data.cardNumber.replace(/\s/g, ''),
                            card_holder_name: payment_data.cardHolderName,
                            card_expiry_mm: payment_data.expiryMonth,
                            card_expiry_yy: payment_data.expiryYear,
                            card_cvv: payment_data.cvv
                        }
                    }
                };
                break;

            case 'netbanking':
                payloadData = {
                    payment_session_id: payment_session_id,
                    payment_method: {
                        netbanking: {
                            channel: "link",
                            netbanking_bank_code: payment_data.bankCode
                        }
                    }
                };
                break;

            case 'wallet':
                payloadData = {
                    payment_session_id: payment_session_id,
                    payment_method: {
                        app: {
                            channel: "link",
                            provider: payment_data.walletProvider,
                            phone: payment_data.phone || "9999999999"
                        }
                    }
                };
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: "Invalid payment method"
                });
        }

        console.log("API URL:", apiUrl);
        console.log("Payload:", JSON.stringify(payloadData, null, 2));

        // Make payment request to Cashfree
        const response = await axios.post(
            apiUrl,
            payloadData,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": CASHFREE_API_VERSION
                }
            }
        );

        console.log("Payment response:", response.data);

        // Handle different response types
        if (response.data.data && response.data.data.url) {
            // Payment requires redirect (3D Secure, Net Banking, etc.)
            return res.json({
                success: true,
                requires_redirect: true,
                redirect_url: response.data.data.url,
                payment_status: 'PENDING',
                cf_payment_id: response.data.cf_payment_id
            });
        }

        // For UPI collect requests
        if (response.data.channel === 'collect' && response.data.data) {
            return res.json({
                success: true,
                payment_status: 'PENDING',
                requires_polling: true,
                cf_payment_id: response.data.cf_payment_id,
                payment_method: payment_method
            });
        }

        // Direct success
        res.json({
            success: true,
            payment_status: 'SUCCESS',
            cf_payment_id: response.data.cf_payment_id,
            payment_method: payment_method
        });

    } catch (error) {
        console.error("Payment processing error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            payment_status: 'FAILED',
            error: error.response?.data?.message || error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💳 Cashfree Mode: sandbox`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
});
