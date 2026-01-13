import React, { useState } from 'react';
import { FaRegCreditCard } from "react-icons/fa";
import { LuShieldCheck } from "react-icons/lu";
import { IoMdLock } from "react-icons/io";

const CashfreePayment = () => {
    const [showCustomPopup, setShowCustomPopup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('card'); // Track active payment method
    const [paymentDetails, setPaymentDetails] = useState({
        amount: 500,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardType: '', // Track card type for icon display
        upiId: '',
        bankCode: '',
        walletId: ''
    });

    // Product details for the left panel
    const productDetails = {
        name: 'Premium Plan',
        description: 'Access to all premium features',
        features: [
            'Unlimited access to all features',
            'Priority customer support',
            'Advanced analytics dashboard',
            'Custom branding options',
            'API access with higher limits'
        ],
        amount: 500
    };

    // Load Cashfree SDK
    const loadCashfreeSDK = () => {
        return new Promise((resolve, reject) => {
            if (window.Cashfree) {
                resolve(window.Cashfree);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.async = true;
            script.onload = () => resolve(window.Cashfree);
            script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
            document.body.appendChild(script);
        });
    };

    // Handle opening custom popup
    const handlePayNowClick = () => {
        setShowCustomPopup(true);
    };

    // Handle closing custom popup
    const handleClosePopup = () => {
        setShowCustomPopup(false);
        resetPaymentDetails();
    };

    // Function to detect card type based on card number
    const getCardType = (number) => {
        // Visa
        const visaRegex = /^4[0-9]{12}(?:[0-9]{3})?$/;
        // Mastercard
        const mastercardRegex = /^5[1-5][0-9]{14}$/;
        // American Express
        const amexRegex = /^3[47][0-9]{13}$/;
        // Discover
        const discoverRegex = /^6(?:011|5[0-9]{2})[0-9]{12}$/;
        // Diners Club
        const dinersRegex = /^3[0689][0-9]{11}$/;
        
        if (visaRegex.test(number)) return 'Visa';
        if (mastercardRegex.test(number)) return 'Mastercard';
        if (amexRegex.test(number)) return 'American Express';
        if (discoverRegex.test(number)) return 'Discover';
        if (dinersRegex.test(number)) return 'Diners Club';
        
        return '';
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = { ...paymentDetails, [name]: value };
        
        // Update card type when card number changes
        if (name === 'cardNumber') {
            const cardType = getCardType(value);
            updatedValue.cardType = cardType;
        }
        
        setPaymentDetails(updatedValue);
    };

    // Handle tab change for payment methods
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Reset payment details when closing popup
    const resetPaymentDetails = () => {
        setPaymentDetails({
            amount: 500,
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            cardNumber: '',
            expiryMonth: '',
            expiryYear: '',
            cvv: '',
            cardType: '',
            upiId: '',
            bankCode: '',
            walletId: ''
        });
        setActiveTab('card');
    };

    // Create order on your backend (mock function)
    const createOrder = async () => {

        // Mock response - Replace with actual API call
        return {
            order_id: 'order_' + Date.now(),
            payment_session_id: 'session_' + Math.random().toString(36).substr(2, 9),
            order_amount: paymentDetails.amount,
            order_currency: 'USD'
        };
    };

    // Handle payment from custom popup
    const handleProceedToPayment = async () => {
        // Validate customer details
        if (!paymentDetails.customerName || !paymentDetails.customerEmail || !paymentDetails.customerPhone) {
            alert('Please fill all required customer details');
            return;
        }

        // Validate payment method specific fields
        let isValid = true;
        let errorMsg = '';

        switch (activeTab) {
            case 'card':
                if (!paymentDetails.cardNumber || !paymentDetails.expiryMonth ||
                    !paymentDetails.expiryYear || !paymentDetails.cvv) {
                    isValid = false;
                    errorMsg = 'Please fill all card details';
                } else if (paymentDetails.cardNumber.length !== 16 || isNaN(paymentDetails.cardNumber)) {
                    isValid = false;
                    errorMsg = 'Please enter a valid 16-digit card number';
                } else if (isNaN(paymentDetails.expiryMonth) || isNaN(paymentDetails.expiryYear) ||
                    paymentDetails.expiryMonth < 1 || paymentDetails.expiryMonth > 12 ||
                    paymentDetails.expiryYear.toString().length !== 2) {
                    isValid = false;
                    errorMsg = 'Please enter valid expiry date (MM/YY)';
                } else if (paymentDetails.cvv.length !== 3 || isNaN(paymentDetails.cvv)) {
                    isValid = false;
                    errorMsg = 'Please enter a valid 3-digit CVV';
                }
                break;
            case 'upi':
                if (!paymentDetails.upiId || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(paymentDetails.upiId)) {
                    isValid = false;
                    errorMsg = 'Please enter a valid UPI ID';
                }
                break;
            case 'netbanking':
                if (!paymentDetails.bankCode) {
                    isValid = false;
                    errorMsg = 'Please select a bank';
                }
                break;
            case 'wallet':
                if (!paymentDetails.walletId) {
                    isValid = false;
                    errorMsg = 'Please select a wallet';
                }
                break;
        }

        if (!isValid) {
            alert(errorMsg);
            return;
        }

        setLoading(true);

        try {
            // Step 1: Load Cashfree SDK
            await loadCashfreeSDK();

            // Step 2: Create order on your backend
            const orderData = await createOrder();

            // Step 3: Initialize Cashfree with payment session
            const cashfree = window.Cashfree({
                mode: 'sandbox' // Change to 'production' in production
            });

            // Step 4: Configure checkout options based on payment method
            const checkoutOptions = {
                paymentSessionId: orderData.payment_session_id,
                returnUrl: window.location.origin + '/payment-success',
                notifyUrl: 'https://your-backend.com/webhook', // Your webhook URL
            };

            // Specify payment method if needed
            if (activeTab === 'card') {
                checkoutOptions.paymentMethod = {
                    card: {
                        number: paymentDetails.cardNumber,
                        expiryMonth: paymentDetails.expiryMonth,
                        expiryYear: paymentDetails.expiryYear,
                        cvv: paymentDetails.cvv,
                        channel: "card",
                        type: "card"
                    }
                };
            } else if (activeTab === 'upi') {
                checkoutOptions.paymentMethod = {
                    upi: {
                        channel: "upi",
                        type: "upi",
                        upiId: paymentDetails.upiId,
                    }
                };
            } else if (activeTab === 'netbanking') {
                checkoutOptions.paymentMethod = {
                    netbanking: {
                        channel: "netbanking",
                        type: "nb",
                        bankCode: paymentDetails.bankCode,
                    }
                };
            } else if (activeTab === 'wallet') {
                checkoutOptions.paymentMethod = {
                    wallet: {
                        channel: "wallet",
                        type: "wallet",
                        walletId: paymentDetails.walletId,
                    }
                };
            }

            // Step 5: Open Cashfree payment popup
            cashfree.checkout(checkoutOptions).then((result) => {
                if (result.error) {
                    console.error('Payment failed:', result.error);
                    alert('Payment failed: ' + result.error.message);
                }
                if (result.paymentDetails) {
                    console.log('Payment successful:', result.paymentDetails);
                    alert('Payment successful! Order ID: ' + result.paymentDetails.orderId);
                    resetPaymentDetails();
                }
            });

            // Close custom popup after initiating Cashfree
            setShowCustomPopup(false);

        } catch (error) {
            console.error('Error:', error);
            alert('Error processing payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <FaRegCreditCard className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Premium Plan
                    </h1>
                    <p className="text-gray-600">
                        Get access to all premium features
                    </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 mb-6 text-white">
                    <div className="text-sm opacity-90 mb-1">Total Amount</div>
                    <div className="text-4xl font-bold">₹{paymentDetails.amount}</div>
                    <div className="text-sm opacity-90 mt-2">One-time payment</div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-700">
                        <LuShieldCheck className="w-5 h-5 text-green-500 mr-3" />
                        <span>Secure payment gateway</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                        <IoMdLock className="w-5 h-5 text-green-500 mr-3" />
                        <span>256-bit SSL encryption</span>
                    </div>
                </div>

                <button
                    onClick={handlePayNowClick}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Pay Now
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Powered by Cashfree Payments
                </p>
            </div>

            {/* Custom Popup Modal */}
            {showCustomPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl w-[1000px] max-h-[90vh] overflow-hidden flex">
                        {/* Product Details Section - Left Side */}
                        <div className="w-2/5 bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center mb-6">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">{productDetails.name}</h2>
                                </div>
                                
                                <p className="text-gray-600 mb-8">{productDetails.description}</p>
                                
                                <ul className="space-y-3 mb-8">
                                    {productDetails.features.map((feature, index) => (
                                        <li key={index} className="flex items-start">
                                            <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">₹{productDetails.amount}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Tax</span>
                                    <span className="font-medium">₹0.00</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold mt-4 pt-4 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>₹{productDetails.amount}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Payment Details Section - Right Side */}
                        <div className="w-3/5 p-8 overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Secure Payment</h2>
                                <button
                                    onClick={handleClosePopup}
                                    className="text-gray-500 hover:text-gray-700"
                                    disabled={loading}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Payment Method Tabs */}
                            <div className="mb-6">
                                <div className="flex border-b border-gray-200">
                                    <button
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'card' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                                        onClick={() => handleTabChange('card')}
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                            </svg>
                                            Credit/Debit Card
                                        </div>
                                    </button>
                                    <button
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'upi' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                                        onClick={() => handleTabChange('upi')}
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                                            </svg>
                                            UPI
                                        </div>
                                    </button>
                                    <button
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'netbanking' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                                        onClick={() => handleTabChange('netbanking')}
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
                                            </svg>
                                            Net Banking
                                        </div>
                                    </button>
                                    <button
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'wallet' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                                        onClick={() => handleTabChange('wallet')}
                                    >
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            Wallet
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Customer Details Form */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-medium text-gray-700 mb-2">Customer Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={paymentDetails.customerName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="customerEmail"
                                            value={paymentDetails.customerEmail}
                                            onChange={handleInputChange}
                                            placeholder="email@example.com"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            name="customerPhone"
                                            value={paymentDetails.customerPhone}
                                            onChange={handleInputChange}
                                            placeholder="9876543210"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Forms */}
                            <div className="mb-6">
                                {activeTab === 'card' && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-700 mb-2">Card Details</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Card Number *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="cardNumber"
                                                    value={paymentDetails.cardNumber}
                                                    onChange={handleInputChange}
                                                    placeholder="1234 5678 9012 3456"
                                                    maxLength="16"
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                    disabled={loading}
                                                />
                                                {paymentDetails.cardType && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        {paymentDetails.cardType === 'Visa' && (
                                                            <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                                                                VISA
                                                            </div>
                                                        )}
                                                        {paymentDetails.cardType === 'Mastercard' && (
                                                            <div className="w-8 h-5 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">
                                                                MC
                                                            </div>
                                                        )}
                                                        {paymentDetails.cardType === 'American Express' && (
                                                            <div className="w-10 h-5 bg-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                                                                AMEX
                                                            </div>
                                                        )}
                                                        {paymentDetails.cardType === 'Discover' && (
                                                            <div className="w-10 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
                                                                DISC
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Expiry Month *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="expiryMonth"
                                                    value={paymentDetails.expiryMonth}
                                                    onChange={handleInputChange}
                                                    placeholder="MM"
                                                    maxLength="2"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Expiry Year *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="expiryYear"
                                                    value={paymentDetails.expiryYear}
                                                    onChange={handleInputChange}
                                                    placeholder="YY"
                                                    maxLength="2"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                CVV *
                                            </label>
                                            <input
                                                type="password"
                                                name="cvv"
                                                value={paymentDetails.cvv}
                                                onChange={handleInputChange}
                                                placeholder="123"
                                                maxLength="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'upi' && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-700 mb-2">UPI Payment</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                UPI ID *
                                            </label>
                                            <input
                                                type="text"
                                                name="upiId"
                                                value={paymentDetails.upiId}
                                                onChange={handleInputChange}
                                                placeholder="yourname@upi"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-700">
                                                Enter your UPI ID (e.g., yourname@paytm, yourname@oksbi, yourname@ybl)
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'netbanking' && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-700 mb-2">Net Banking</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select Bank *
                                            </label>
                                            <select
                                                name="bankCode"
                                                value={paymentDetails.bankCode}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                disabled={loading}
                                            >
                                                <option value="">Choose your bank</option>
                                                <option value="ICIC">ICICI Bank</option>
                                                <option value="HDFC">HDFC Bank</option>
                                                <option value="SBI">State Bank of India</option>
                                                <option value="AXIS">Axis Bank</option>
                                                <option value="KOTAK">Kotak Mahindra Bank</option>
                                                <option value="PNB">Punjab National Bank</option>
                                                <option value="BOB">Bank of Baroda</option>
                                                <option value="UNION">Union Bank of India</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'wallet' && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-700 mb-2">Wallet</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select Wallet *
                                            </label>
                                            <select
                                                name="walletId"
                                                value={paymentDetails.walletId}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                disabled={loading}
                                            >
                                                <option value="">Choose your wallet</option>
                                                <option value="paytm">Paytm</option>
                                                <option value="phonepe">PhonePe</option>
                                                <option value="amazon">Amazon Pay</option>
                                                <option value="mobikwik">MobiKwik</option>
                                                <option value="freecharge">FreeCharge</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Security Notice */}
                            <div className="mb-6 flex items-start bg-green-50 border border-green-200 rounded-lg p-4">
                                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                                <p className="text-sm text-green-800">
                                    Your payment information is secure and encrypted. We never store your card details.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleProceedToPayment}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Processing Payment...
                                        </span>
                                    ) : (
                                        `Pay ₹${paymentDetails.amount} Now`
                                    )}
                                </button>

                                <button
                                    onClick={handleClosePopup}
                                    disabled={loading}
                                    className="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashfreePayment;