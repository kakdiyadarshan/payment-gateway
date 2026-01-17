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

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create Order endpoint
app.post("/api/create-order", async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;

        if (!amount || !customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({ error: "Missing required fields" });
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

        console.log("Processing payment for order:", order_id);

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
                            channel: "post",
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

        console.log("Full Payment response:", JSON.stringify(response.data, null, 2));

        // CRITICAL FIX: Extract payment ID from ALL possible locations in Cashfree response
        let cf_payment_id = response.data.cf_payment_id ||
            response.data.data?.cf_payment_id ||
            response.data.payment_id ||
            response.data.data?.payment_id ||
            response.data.data?.payload?.cf_payment_id;

        // For redirect/authenticate responses, extract from authenticate object if present
        if (!cf_payment_id && response.data.data?.authenticate) {
            cf_payment_id = response.data.data.authenticate.cf_payment_id;
        }

        // Extract from URL if payment ID is embedded there (fallback)
        if (!cf_payment_id && response.data.data?.url) {
            const urlMatch = response.data.data.url.match(/pay_[a-zA-Z0-9]+/);
            if (urlMatch) {
                cf_payment_id = urlMatch[0];
                console.log("Extracted cf_payment_id from URL:", cf_payment_id);
            }
        }

        console.log("=== Payment ID Extraction ===");
        console.log("Response root cf_payment_id:", response.data.cf_payment_id);
        console.log("Response data cf_payment_id:", response.data.data?.cf_payment_id);
        console.log("Final extracted cf_payment_id:", cf_payment_id);

        const responseData = {
            success: true,
            cf_payment_id: cf_payment_id,
            payment_method: response.data.payment_method,
            channel: response.data.channel,
            payment_status: response.data.payment_status || 'PENDING',
            order_id: order_id,
            // Store the entire response for debugging
            raw_response: response.data
        };

        // Handle different response types
        if (response.data.data && response.data.data.url) {
            // Payment requires redirect (3D Secure, Net Banking, etc.)
            return res.json({
                ...responseData,
                requires_redirect: true,
                redirect_url: response.data.data.url
            });
        }

        // For UPI collect requests
        if (response.data.channel === 'collect' && response.data.data) {
            return res.json({
                ...responseData,
                requires_polling: true
            });
        }

        // Direct success
        res.json({
            ...responseData,
            payment_status: 'SUCCESS'
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

// Get Payment Status endpoint (for polling)
app.get("/api/payment-status/:order_id/:cf_payment_id", async (req, res) => {
    try {
        const { order_id, cf_payment_id } = req.params;

        console.log("Checking payment status:", { order_id, cf_payment_id });

        // Validate payment ID
        if (!cf_payment_id || cf_payment_id === 'undefined' || cf_payment_id === 'null') {
            console.error("Invalid payment ID provided:", cf_payment_id);
            return res.status(400).json({
                success: false,
                error: "Invalid payment ID"
            });
        }

        // Get order details from Cashfree
        const response = await axios.get(
            `${CASHFREE_BASE_URL}/pg/orders/${order_id}/payments/${cf_payment_id}`,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": CASHFREE_API_VERSION
                }
            }
        );

        console.log("Payment status response:", response.data);

        res.json({
            success: true,
            payment_status: response.data.payment_status,
            order_id: response.data.order_id,
            cf_payment_id: response.data.cf_payment_id,
            payment_amount: response.data.payment_amount,
            payment_time: response.data.payment_time
        });

    } catch (error) {
        console.error("Status check error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
});

// Helper endpoint to get latest payment ID for an order
app.get("/api/order-payment/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params;

        console.log("Getting latest payment for order:", order_id);

        // First try to get order details
        const orderResponse = await axios.get(
            `${CASHFREE_BASE_URL}/pg/orders/${order_id}`,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": CASHFREE_API_VERSION
                }
            }
        );

        console.log("Order response:", orderResponse.data);

        // Get payments for this order
        const paymentsResponse = await axios.get(
            `${CASHFREE_BASE_URL}/pg/orders/${order_id}/payments`,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": CASHFREE_API_VERSION
                }
            }
        );

        console.log("Payments response:", paymentsResponse.data);

        // Return the latest payment
        const payments = paymentsResponse.data;
        if (payments && payments.length > 0) {
            const latestPayment = payments[0]; // Assuming first is latest
            return res.json({
                success: true,
                cf_payment_id: latestPayment.cf_payment_id,
                payment_status: latestPayment.payment_status,
                payment_method: latestPayment.payment_method
            });
        }

        res.status(404).json({
            success: false,
            error: "No payments found for this order"
        });

    } catch (error) {
        console.error("Error getting order payment:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
});

// Helper function to verify OTP with retry logic
const verifyOtpWithRetry = async (cfPaymentId, otp, maxRetries = 3) => {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`OTP Verification Attempt ${attempt}/${maxRetries}`);

            const response = await axios.post(
                `${CASHFREE_BASE_URL}/pg/orders/pay/authenticate/${cfPaymentId}`,
                {
                    action: "SUBMIT_OTP",
                    otp: otp
                },
                {
                    headers: {
                        "x-client-id": process.env.CASHFREE_APP_ID,
                        "x-client-secret": process.env.CASHFREE_SECRET,
                        "x-api-version": CASHFREE_API_VERSION,
                        "Content-Type": "application/json"
                    }
                }
            );

            return { success: true, data: response.data };
        } catch (error) {
            lastError = error;
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message;

            console.log(`Attempt ${attempt} failed:`, errorCode, errorMessage);

            // Only retry for specific errors that might be timing-related
            const retryableErrors = ['payment_not_found', 'transaction_not_found', 'invalid_request_error'];
            const isRetryable = retryableErrors.includes(errorCode) ||
                errorMessage?.toLowerCase().includes('not found') ||
                error.response?.status === 404;

            if (isRetryable && attempt < maxRetries) {
                // Wait before retry with exponential backoff
                const waitTime = attempt * 1500; // 1.5s, 3s, 4.5s
                console.log(`Waiting ${waitTime}ms before retry...`);
                await delay(waitTime);
            } else if (!isRetryable) {
                // Non-retryable error, break immediately
                break;
            }
        }
    }

    return { success: false, error: lastError };
};

// FIXED: Verify OTP endpoint - Submit OTP to Cashfree with retry logic
app.post("/api/verify-otp", async (req, res) => {
    try {
        const { cf_payment_id, otp, order_id } = req.body;

        // Validate inputs
        if (!cf_payment_id || !otp) {
            return res.status(400).json({
                success: false,
                message: "Missing cf_payment_id or OTP"
            });
        }

        console.log("=== OTP Verification Request ===");
        console.log("cf_payment_id:", cf_payment_id);
        console.log("order_id:", order_id);
        console.log("OTP:", otp);

        // Validate payment ID format
        if (!cf_payment_id.startsWith('pay_')) {
            console.warn("Warning: Payment ID doesn't start with 'pay_'", cf_payment_id);
        }

        // Add a small initial delay to give Cashfree time to fully register the payment
        console.log("Waiting 1 second before OTP verification...");
        await delay(1000);

        // Try to verify OTP with retry logic
        const result = await verifyOtpWithRetry(cf_payment_id, otp, 3);

        if (result.success) {
            console.log("=== OTP Verification Success ===");
            console.log(JSON.stringify(result.data, null, 2));

            const paymentData = result.data;

            return res.json({
                success: true,
                status: paymentData.payment_status,
                message: paymentData.payment_message || "OTP verified successfully",
                data: paymentData
            });
        } else {
            // All retries failed
            const error = result.error;
            console.error('=== OTP Verification Failed After Retries ===');
            console.error('Status:', error.response?.status);
            console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));

            const errorDetail = error.response?.data;

            return res.status(400).json({
                success: false,
                message: errorDetail?.message || "OTP verification failed",
                code: errorDetail?.code,
                type: errorDetail?.type,
                retried: true
            });
        }

    } catch (error) {
        console.error('=== OTP Verification Unexpected Error ===');
        console.error('Error:', error.message);

        res.status(500).json({
            success: false,
            message: error.message || "OTP verification failed",
            code: "server_error",
            type: "server_error"
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});