import { ViewStyle } from "react-native";

export interface PaymentError {
	code: string;
	message: string;
	recoverable: boolean;
	details?: Record<string, any>;
}

export interface CanMakePaymentsResult {
	canMakePayments: boolean;
	status: "READY" | "NOT_READY" | "NOT_SUPPORTED" | "UNKNOWN";
	needsActivation: boolean;
}

export interface PaymentStatus {
	status: "success";
	credential: string;
	orderNumber: string;
	merchantName: string;
	timestamp: number;
	extraData: Record<string, any>;
}

export type CanMakePaymentsResponse =
	| { success: true; data: CanMakePaymentsResult }
	| { success: false; error: PaymentError };

export type InitiatePaymentResponse =
	| { success: true; data: PaymentStatus }
	| { success: false; error: PaymentError };

export type SupportedBrand =
	| "VISA"
	| "MASTERCARD"
	| "AMEX"
	| "DISCOVER"
	| "MADA";

export interface SamsungPayOptions {
	serviceId: string;
	merchantName: string;
	orderNumber: string;
	merchantCountryCode: string;
	amount: number;
	allowedCardBrands?: SupportedBrand[];
	items: Array<{
		id: string;
		name: string;
		amount: number;
		description?: string;
	}>;
}

export interface ButtonOptions {
	type?: "pay" | "buy" | "checkout";
	style?: "black" | "white" | "color";
	radius?: number;
	isDisabled?: boolean;
	isLoading?: boolean;
}

export interface ButtonProps
	extends ButtonOptions,
		ViewStyle,
		SamsungPayOptions {
	onPaymentCompleted?: (result: PaymentStatus) => void;
	onPaymentFailed?: (error: PaymentError) => void;
	onButtonClicked?: () => void;
	onPress?: () => void;
}
