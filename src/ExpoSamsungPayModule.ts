import { requireNativeModule } from "expo";
import type {
	CanMakePaymentsResponse,
	CanMakePaymentsResult,
	InitiatePaymentResponse,
	PaymentError,
	PaymentStatus,
	SamsungPayOptions,
} from "./ExpoSamsungPay.types";

export interface SamsungPayModule {
	canMakePayments(serviceId: string): Promise<CanMakePaymentsResponse>;
	initiatePayment(options: SamsungPayOptions): Promise<InitiatePaymentResponse>;
	cleanup(): Promise<void>;
	addListener(
		event: "onPaymentCompleted",
		listener: (data: PaymentStatus) => void,
	): { remove: () => void };
	addListener(
		event: "onPaymentFailed",
		listener: (error: PaymentError) => void,
	): { remove: () => void };
	addListener(
		event: "onPaymentStatusChanged",
		listener: (status: CanMakePaymentsResult) => void,
	): { remove: () => void };
}

export default requireNativeModule<SamsungPayModule>("ExpoSamsungPay");
