require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Create Order endpoint
app.post("/api/create-order", async (req, res) => {
    try {
        const { amount, customer_email, customer_phone    } = req.body;

        const orderId = "order_" + Date.now();

        const response = await axios.post(
            "https://sandbox.cashfree.com/pg/orders",
            {
                order_id: orderId,
                order_amount: amount,
                order_currency: "INR",
                customer_details: {
                    customer_id: "cust_" + Date.now(),
                    customer_email,
                    customer_phone
                },
                order_meta: {
                    return_url: `http://localhost:3000/payment-response?order_id=${orderId}`
                }
            },
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "Content-Type": "application/json",
                    "x-api-version": "2023-08-01"
                }
            }
        );
        console.log("create-order-------",response)
        res.json(response.data);
    } catch (error) {
        console.log(error.response?.data || error.message);
        res.status(500).json({
            message: "Order Creation Failed",
            error: error.response?.data || error.message
        });
    }
});

// Verify Payment endpoint
app.post("/api/verify-payment", async (req, res) => {
    try {
        const { order_id } = req.body;

        const response = await axios.get(
            `https://sandbox.cashfree.com/pg/orders/${order_id}`,
            {
                headers: {
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET,
                    "x-api-version": "2023-08-01"
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.log(error.response?.data || error.message);
        res.status(500).json({
            message: "Payment Verification Failed",
            error: error.response?.data || error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
