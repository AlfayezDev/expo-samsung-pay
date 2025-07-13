import React, { useEffect } from "react";
import { Platform } from "react-native";
import SamsungPayView from "./ExpoSamsungPayView";
import SamsungPayModule from "./ExpoSamsungPayModule";
import type {
	ButtonProps,
	SamsungPayOptions,
	PaymentStatus,
} from "./ExpoSamsungPay.types";

export async function canMakePayments(serviceId: string): Promise<boolean> {
	if (Platform.OS !== "android") return false;

	try {
		return await SamsungPayModule.canMakePayments(serviceId).catch(() => false);
	} catch {
		return false;
	}
}

async function initiatePayment(options: SamsungPayOptions): Promise<void> {
	return await SamsungPayModule.initiatePayment(options);
}

function addPaymentListener(listener: (event: PaymentStatus) => void) {
	return SamsungPayModule.addListener("onPaymentCompleted", listener);
}

function addFailureListener(listener: (event: PaymentStatus) => void) {
	return SamsungPayModule.addListener("onPaymentFailed", listener);
}

function addButtonListener(listener: () => void) {
	return SamsungPayModule.addListener("onButtonClicked", listener);
}

export const SamsungPayButton = (props: ButtonProps) => {
	const handlePress = () => {
		if (props.onPress) {
			props.onPress();
			return;
		}

		if (
			props.amount &&
			props.items &&
			props.merchantName &&
			props.merchantCountryCode &&
			props.orderNumber &&
			props.serviceId &&
			props.items
		) {
			initiatePayment(props).catch((error) => {
				throw error;
			});
		}
	};

	useEffect(() => {
		if (Platform.OS !== "android") return;

		const paymentSub = addPaymentListener(
			props.onPaymentCompleted || (() => {}),
		);
		const failureSub = addFailureListener(props.onPaymentFailed || (() => {}));
		const buttonSub = addButtonListener(handlePress);

		return () => {
			paymentSub.remove();
			failureSub.remove();
			buttonSub.remove();
		};
	}, [handlePress, props.onPaymentCompleted, props.onPaymentFailed]);

	if (Platform.OS !== "android") return null;

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
			onPress={handlePress}
			paymentOptions={props}
		/>
	);
};
