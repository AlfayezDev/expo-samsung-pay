import React from "react";
import SamsungPayView from "./ExpoSamsungPayView";
import SamsungPayModule from "./ExpoSamsungPayModule";
import type {
	CanMakePaymentsResponse,
	InitiatePaymentResponse,
	SamsungPayOptions,
	SamsungPayViewProps,
} from "./ExpoSamsungPay.types";

export async function canMakePayments(
	serviceId: string,
): Promise<CanMakePaymentsResponse> {
	return SamsungPayModule.canMakePayments(serviceId);
}

export async function initiatePayment(
	options: SamsungPayOptions,
): Promise<InitiatePaymentResponse> {
	return SamsungPayModule.initiatePayment(options);
}

export function SamsungPayButton(
	props: SamsungPayViewProps & SamsungPayOptions,
) {
	return (
		<SamsungPayView
			width={props.width}
			height={props.height}
			type={props.type}
			style={props.style}
			radius={props.radius}
			isDisabled={props.isDisabled}
			isLoading={props.isLoading}
			onPaymentCompleted={props.onPaymentCompleted}
			onPaymentFailed={props.onPaymentFailed}
			onPress={props.onPress}
			paymentOptions={{
				serviceId: props.serviceId,
				merchantName: props.merchantName,
				orderNumber: props.orderNumber,
				merchantCountryCode: props.merchantCountryCode,
				amount: props.amount,
				allowedCardBrands: props.allowedCardBrands,
				items: props.items,
			}}
			children={props.children}
		/>
	);
}

export default {
	canMakePayments,
	SamsungPayButton,
};
