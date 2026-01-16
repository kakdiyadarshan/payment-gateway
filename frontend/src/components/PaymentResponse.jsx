import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // If using React Router

const PaymentResponse = () => {
    const [paymentStatus, setPaymentStatus] = useState('loading');
    const [orderDetails, setOrderDetails] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get order_id from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');

        if (!orderId) {
            setPaymentStatus('error');
            setError('No order ID found');
            return;
        }

        // Verify payment status
        verifyPayment(orderId);
    }, []);

    const verifyPayment = async (orderId) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/payment-status/${orderId}`);
            
            if (response.data.status === 'success') {
                setOrderDetails(response.data.data);
                
                // Set payment status based on order status
                const orderStatus = response.data.data.order_status;
                if (orderStatus === 'PAID') {
                    setPaymentStatus('success');
                } else if (orderStatus === 'ACTIVE') {
                    setPaymentStatus('pending');
                } else if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
                    setPaymentStatus('failed');
                } else {
                    setPaymentStatus('unknown');
                }
            } else {
                setPaymentStatus('error');
                setError('Failed to verify payment');
            }
        } catch (err) {
            console.error('Payment verification error:', err);
            setPaymentStatus('error');
            setError(err.response?.data?.message || 'Failed to verify payment status');
        }
    };

    const handleGoHome = () => {
        // Navigate to home page or dashboard
        window.location.href = '/';
    };

    const handleRetryPayment = () => {
        // Navigate back to payment page
        window.location.href = '/';
    };

    if (paymentStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Payment</h2>
                    <p className="text-gray-600">Please wait while we confirm your payment...</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Payment Successful!
                        </h1>
                        <p className="text-gray-600">
                            Your payment has been processed successfully
                        </p>
                    </div>

                    {orderDetails && (
                        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Order ID</span>
                                <span className="font-semibold text-gray-800">{orderDetails.order_id}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Amount Paid</span>
                                <span className="font-semibold text-green-600">₹{orderDetails.order_amount}</span>
                            </div>
                            {orderDetails.payment_details && (
                                <>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                        <span className="text-gray-600">Payment Method</span>
                                        <span className="font-medium text-gray-800 capitalize">
                                            {orderDetails.payment_details.payment_method}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                        <span className="text-gray-600">Transaction ID</span>
                                        <span className="font-mono text-xs text-gray-700">
                                            {orderDetails.payment_details.transaction_id}
                                        </span>
                                    </div>
                                    {orderDetails.payment_details.payment_time && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Payment Time</span>
                                            <span className="font-medium text-gray-800">
                                                {new Date(orderDetails.payment_details.payment_time).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleGoHome}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Go to Dashboard
                        </button>
                        <p className="text-center text-sm text-gray-500">
                            A confirmation email has been sent to your registered email address
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Payment Pending
                        </h1>
                        <p className="text-gray-600">
                            Your payment is being processed
                        </p>
                    </div>

                    {orderDetails && (
                        <div className="bg-gray-50 rounded-xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                                <span className="text-gray-600">Order ID</span>
                                <span className="font-semibold text-gray-800">{orderDetails.order_id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Amount</span>
                                <span className="font-semibold text-gray-800">₹{orderDetails.order_amount}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleGoHome}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Go to Dashboard
                        </button>
                        <p className="text-center text-sm text-gray-500">
                            We'll notify you once the payment is confirmed
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Failed or Error state
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Payment Failed
                    </h1>
                    <p className="text-gray-600 mb-4">
                        {error || 'Your payment could not be processed'}
                    </p>
                </div>

                {orderDetails && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                            <span className="text-gray-600">Order ID</span>
                            <span className="font-semibold text-gray-800">{orderDetails.order_id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Status</span>
                            <span className="font-semibold text-red-600">{orderDetails.order_status}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleRetryPayment}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={handleGoHome}
                        className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-all duration-200"
                    >
                        Go to Home
                    </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Need help?</strong> Contact our support team at support@example.com
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentResponse;