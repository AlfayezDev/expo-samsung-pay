import { ViewStyle } from "react-native";

export type PaymentStatus = {
	status: "success" | "error";
	credential?: string;
	errorCode?: number;
	errorDescription?: string;
};

export type SupportedBrand =
	| "VISA"
	| "MASTERCARD"
	| "AMEX"
	| "DISCOVER"
	| "MADA";

export type SamsungPayOptions = {
	serviceId: string;
	merchantName: string;
	orderNumber: string;
	merchantCountryCode: string;
	amount: number;
	supportedBrands?: SupportedBrand[];
	items: Array<{
		id: string;
		name: string;
		amount: number;
		description?: string;
	}>;
};

export type ButtonOptions = {
	type?: "pay" | "buy" | "checkout";
	style?: "black" | "white" | "color";
	radius?: number;
	isDisabled?: boolean;
	isLoading?: boolean;
};

export type ButtonProps = ButtonOptions &
	ViewStyle & {
		onPaymentCompleted?: (status: PaymentStatus) => void;
		onPaymentFailed?: (status: PaymentStatus) => void;
		onButtonClicked?: () => void;
		onPress?: () => void;
	} & SamsungPayOptions;
