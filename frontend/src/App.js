import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CashfreePayment from './components/PaymentPage';
import PaymentResponse from './components/PaymentResponse';

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<CashfreePayment />} />
				<Route path="/payment-response" element={<PaymentResponse />} />
			</Routes>
		</Router>
	);
}

export default App;
