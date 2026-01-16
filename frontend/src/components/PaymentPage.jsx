import React, { useState } from 'react';
import axios from 'axios';
import { 
    FaArrowLeft, 
    FaCreditCard, 
    FaUniversity, 
    FaWallet,
    FaMobileAlt,
    FaQrcode
} from 'react-icons/fa';
import { MdAccountBalance } from 'react-icons/md';

const CustomCashfreeCheckout = () => {
    const [step, setStep] = useState('initial'); // initial, checkout, processing, success, failed
    const [loading, setLoading] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [orderData, setOrderData] = useState(null);
    
    const [customerDetails, setCustomerDetails] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: ''
    });

    const [paymentData, setPaymentData] = useState({
        // UPI
        upiId: '',
        // Card
        cardNumber: '',
        cardHolderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        // Net Banking
        bankCode: '',
        // Wallet
        walletProvider: ''
    });

    // Business/Product Details
    const businessDetails = {
        name: 'Business Name',
        amount: 250,
        description: 'Premium Plan Purchase'
    };

    // Payment methods configuration
    const paymentMethods = [
        { id: 'upi', name: 'Pay by UPI ID', icon: <FaMobileAlt />, color: '#FF6B00' },
        { id: 'netbanking', name: 'Net Banking', icon: <MdAccountBalance />, color: '#6B4CE6' },
        { id: 'card', name: 'Card', icon: <FaCreditCard />, color: '#6B4CE6' },
        { id: 'wallet', name: 'Wallets', icon: <FaWallet />, color: '#6B4CE6' },
    ];

    // Banks list for Net Banking
    const banks = [
        { code: 'ICIC', name: 'ICICI Bank' },
        { code: 'HDFC', name: 'HDFC Bank' },
        { code: 'SBI', name: 'State Bank of India' },
        { code: 'AXIS', name: 'Axis Bank' },
        { code: 'KOTAK', name: 'Kotak Mahindra Bank' },
        { code: 'PNB', name: 'Punjab National Bank' },
        { code: 'BOB', name: 'Bank of Baroda' },
        { code: 'UNION', name: 'Union Bank of India' },
    ];

    // Wallets list
    const wallets = [
        { id: 'paytm', name: 'Paytm', logo: '📱' },
        { id: 'phonepe', name: 'PhonePe', logo: '💜' },
        { id: 'googlepay', name: 'Google Pay', logo: '🔵' },
        { id: 'amazonpay', name: 'Amazon Pay', logo: '🟠' },
    ];

    // Handle initial button click - show customer details form
    const handlePayNowClick = () => {
        setStep('customer-details');
    };

    // Handle customer details submission
    const handleCustomerDetailsSubmit = async () => {
        // Validate
        if (!customerDetails.customerName || !customerDetails.customerEmail || !customerDetails.customerPhone) {
            alert('Please fill all customer details');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerDetails.customerEmail)) {
            alert('Please enter a valid email');
            return;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(customerDetails.customerPhone)) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);

        try {
            // Create order
            const response = await axios.post('http://localhost:5000/api/create-order', {
                amount: businessDetails.amount,
                customerName: customerDetails.customerName,
                customerEmail: customerDetails.customerEmail,
                customerPhone: customerDetails.customerPhone
            });

            console.log('Order created:', response.data);
            setOrderData(response.data);
            setStep('checkout');
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Failed to create order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle payment method selection
    const handlePaymentMethodClick = (methodId) => {
        setSelectedPaymentMethod(methodId);
    };

    // Handle payment submission
    const handlePaymentSubmit = async () => {
        let isValid = true;
        let errorMsg = '';

        // Validate based on payment method
        switch (selectedPaymentMethod) {
            case 'upi':
                if (!paymentData.upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(paymentData.upiId)) {
                    isValid = false;
                    errorMsg = 'Please enter a valid UPI ID (e.g., name@paytm)';
                }
                break;
            case 'card':
                if (!paymentData.cardNumber || !paymentData.cardHolderName || 
                    !paymentData.expiryMonth || !paymentData.expiryYear || !paymentData.cvv) {
                    isValid = false;
                    errorMsg = 'Please fill all card details';
                } else if (paymentData.cardNumber.replace(/\s/g, '').length < 15) {
                    isValid = false;
                    errorMsg = 'Please enter a valid card number';
                } else if (paymentData.cvv.length < 3) {
                    isValid = false;
                    errorMsg = 'Please enter a valid CVV';
                }
                break;
            case 'netbanking':
                if (!paymentData.bankCode) {
                    isValid = false;
                    errorMsg = 'Please select a bank';
                }
                break;
            case 'wallet':
                if (!paymentData.walletProvider) {
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
        setStep('processing');

        try {
            // Process payment using Cashfree's direct API
            const paymentResponse = await axios.post('http://localhost:5000/api/process-payment', {
                order_id: orderData.order_id,
                payment_session_id: orderData.payment_session_id,
                payment_method: selectedPaymentMethod,
                payment_data: {
                    ...paymentData,
                    phone: customerDetails.customerPhone
                }
            });

            console.log('Payment response:', paymentResponse.data);

            // Handle redirect scenario (for 3D Secure, Net Banking, etc.)
            if (paymentResponse.data.requires_redirect) {
                window.location.href = paymentResponse.data.redirect_url;
                return;
            }

            // Handle polling scenario (for UPI collect)
            if (paymentResponse.data.requires_polling) {
                // In a real app, you'd poll the status endpoint
                // For demo, we'll simulate success after 3 seconds
                setTimeout(() => {
                    setStep('success');
                }, 3000);
                return;
            }

            if (paymentResponse.data.payment_status === 'SUCCESS') {
                setStep('success');
            } else {
                setStep('failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setStep('failed');
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes
    const handleInputChange = (field, value) => {
        if (field.startsWith('customer')) {
            setCustomerDetails(prev => ({ ...prev, [field]: value }));
        } else {
            setPaymentData(prev => ({ ...prev, [field]: value }));
        }
    };

    // Format card number with spaces
    const formatCardNumber = (value) => {
        const cleaned = value.replace(/\s/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted;
    };

    // Initial landing page
    if (step === 'initial') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                            <FaCreditCard className="w-8 h-8 text-indigo-600" />
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
                        <div className="text-4xl font-bold">₹{businessDetails.amount}</div>
                        <div className="text-sm opacity-90 mt-2">One-time payment</div>
                    </div>

                    <button
                        onClick={handlePayNowClick}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                    >
                        Pay Now
                    </button>
                </div>
            </div>
        );
    }

    // Customer details step
    if (step === 'customer-details') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <button
                        onClick={() => setStep('initial')}
                        className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
                    >
                        <FaArrowLeft className="mr-2" /> Back
                    </button>

                    <h2 className="text-2xl font-bold mb-6">Enter Your Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={customerDetails.customerName}
                                onChange={(e) => handleInputChange('customerName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={customerDetails.customerEmail}
                                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={customerDetails.customerPhone}
                                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="9876543210"
                                maxLength="10"
                            />
                        </div>

                        <button
                            onClick={handleCustomerDetailsSubmit}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Processing...' : 'Continue to Payment'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main checkout page (like Cashfree UI)
    if (step === 'checkout') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex">
                    {/* Left Panel - Business Info */}
                    <div className="w-2/5 bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white flex flex-col justify-between">
                        <div>
                            <button
                                onClick={() => setStep('customer-details')}
                                className="text-white mb-8 hover:bg-white/10 rounded-lg p-2 flex items-center"
                            >
                                <FaArrowLeft className="mr-2" />
                            </button>

                            <div className="bg-white/10 rounded-lg w-16 h-16 flex items-center justify-center mb-4">
                                <span className="text-3xl font-bold">B</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">{businessDetails.name}</h2>
                            <div className="text-4xl font-bold mb-2">₹{businessDetails.amount}</div>
                        </div>

                        <div className="text-xs opacity-75">
                            Secured by <span className="font-semibold">Cashfree Payments</span>
                        </div>
                    </div>

                    {/* Right Panel - Payment Options */}
                    <div className="w-3/5 p-8 max-h-[600px] overflow-y-auto">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-1">
                                Payment Options for +91 {customerDetails.customerPhone}
                            </h3>
                            <button className="text-indigo-600 text-sm">Change</button>
                        </div>

                        {/* QR Code Section (for UPI) */}
                        {!selectedPaymentMethod && (
                            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
                                <div className="bg-gray-200 w-32 h-32 mx-auto mb-3 rounded flex items-center justify-center">
                                    <FaQrcode className="text-gray-400 text-6xl" />
                                </div>
                                <button className="bg-indigo-600 text-white px-6 py-2 rounded-full mb-2">
                                    Click to see QR
                                </button>
                                <p className="text-sm text-gray-600">Scan and pay with</p>
                                <div className="flex justify-center gap-2 mt-2">
                                    <span>📱</span>
                                    <span>💜</span>
                                    <span>🔵</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">or other UPI apps</p>
                            </div>
                        )}

                        {/* Payment Methods List */}
                        <div className="space-y-3">
                            {paymentMethods.map((method) => (
                                <div key={method.id}>
                                    <button
                                        onClick={() => handlePaymentMethodClick(method.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                            selectedPaymentMethod === method.id
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <div
                                                className="w-10 h-10 rounded flex items-center justify-center mr-3"
                                                style={{ backgroundColor: `${method.color}20`, color: method.color }}
                                            >
                                                {method.icon}
                                            </div>
                                            <span className="font-medium">{method.name}</span>
                                        </div>
                                        <FaArrowLeft className="transform rotate-180 text-gray-400" />
                                    </button>

                                    {/* Payment Method Details */}
                                    {selectedPaymentMethod === method.id && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            {method.id === 'upi' && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Enter UPI ID</label>
                                                    <input
                                                        type="text"
                                                        value={paymentData.upiId}
                                                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                                                        placeholder="yourname@paytm"
                                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Enter your UPI ID (e.g., yourname@paytm, yourname@ybl)
                                                    </p>
                                                </div>
                                            )}

                                            {method.id === 'card' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Card Number</label>
                                                        <input
                                                            type="text"
                                                            value={paymentData.cardNumber}
                                                            onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                                                            placeholder="1234 5678 9012 3456"
                                                            maxLength="19"
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Cardholder Name</label>
                                                        <input
                                                            type="text"
                                                            value={paymentData.cardHolderName}
                                                            onChange={(e) => handleInputChange('cardHolderName', e.target.value.toUpperCase())}
                                                            placeholder="JOHN DOE"
                                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Month</label>
                                                            <input
                                                                type="text"
                                                                value={paymentData.expiryMonth}
                                                                onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                                                                placeholder="MM"
                                                                maxLength="2"
                                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">Year</label>
                                                            <input
                                                                type="text"
                                                                value={paymentData.expiryYear}
                                                                onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                                                                placeholder="YY"
                                                                maxLength="2"
                                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-1">CVV</label>
                                                            <input
                                                                type="password"
                                                                value={paymentData.cvv}
                                                                onChange={(e) => handleInputChange('cvv', e.target.value)}
                                                                placeholder="123"
                                                                maxLength="3"
                                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {method.id === 'netbanking' && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Select Your Bank</label>
                                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                                        {banks.map((bank) => (
                                                            <button
                                                                key={bank.code}
                                                                onClick={() => handleInputChange('bankCode', bank.code)}
                                                                className={`p-3 border rounded-lg text-left text-sm hover:border-indigo-500 ${
                                                                    paymentData.bankCode === bank.code
                                                                        ? 'border-indigo-600 bg-indigo-50'
                                                                        : 'border-gray-300'
                                                                }`}
                                                            >
                                                                {bank.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {method.id === 'wallet' && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Select Your Wallet</label>
                                                    <div className="space-y-2">
                                                        {wallets.map((wallet) => (
                                                            <button
                                                                key={wallet.id}
                                                                onClick={() => handleInputChange('walletProvider', wallet.id)}
                                                                className={`w-full p-3 border rounded-lg flex items-center hover:border-indigo-500 ${
                                                                    paymentData.walletProvider === wallet.id
                                                                        ? 'border-indigo-600 bg-indigo-50'
                                                                        : 'border-gray-300'
                                                                }`}
                                                            >
                                                                <span className="text-2xl mr-3">{wallet.logo}</span>
                                                                <span>{wallet.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={handlePaymentSubmit}
                                                disabled={loading}
                                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold mt-4 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? 'Processing...' : `Pay ₹${businessDetails.amount}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Processing state
    if (step === 'processing') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
                    <p className="text-gray-600">Please wait while we process your payment...</p>
                </div>
            </div>
        );
    }

    // Success state
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
                    <p className="text-gray-600 mb-6">Your payment has been processed successfully</p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Amount Paid</span>
                            <span className="font-bold text-green-600">₹{businessDetails.amount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Order ID</span>
                            <span className="font-mono text-sm">{orderData?.order_id}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setStep('initial')}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    // Failed state
    if (step === 'failed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Failed</h1>
                    <p className="text-gray-600 mb-6">Your payment could not be processed</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => setStep('checkout')}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => setStep('initial')}
                            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default CustomCashfreeCheckout;