import React from "react";
import { Platform } from "react-native";
import SamsungPayView from "./ExpoSamsungPayView";
import SamsungPayModule from "./ExpoSamsungPayModule";
import type { ButtonProps } from "./ExpoSamsungPay.types";

export async function canMakePayments(serviceId: string): Promise<boolean> {
	if (Platform.OS !== "android") return false;

	try {
		return await SamsungPayModule.canMakePayments(serviceId).catch(() => false);
	} catch {
		return false;
	}
}
export const SamsungPayButton = (props: ButtonProps) => {
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
			onPress={props.onPress}
			paymentOptions={props}
		/>
	);
};
