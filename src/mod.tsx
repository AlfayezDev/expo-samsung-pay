import type {
	CanMakePaymentsResponse,
	InitiatePaymentResponse,
	SamsungPayOptions,
	SamsungPayViewProps,
} from "./ExpoSamsungPay.types";

export async function canMakePayments(
	_: string,
): Promise<CanMakePaymentsResponse> {
	return {
		success: false,
		error: {
			code: "INVALID_DEVICE",
			message: "Not a valid device",
			recoverable: false,
		},
	};
}

export async function initiatePayment(
	_: SamsungPayOptions,
): Promise<InitiatePaymentResponse> {
	return {
		success: false,
		error: {
			code: "INVALID_DEVICE",
			message: "Not a valid device",
			recoverable: false,
		},
	};
}
export const SamsungPayButton = (
	_: SamsungPayViewProps & SamsungPayOptions,
) => {
	return null;
};
export default {
	canMakePayments,
	initiatePayment,
	SamsungPayButton,
};
