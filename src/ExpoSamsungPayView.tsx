import React, { useEffect, useCallback } from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import type { ViewStyle, TextStyle, DimensionValue } from "react-native";
import SamsungPayModule from "./ExpoSamsungPayModule";
import type {
	ButtonOptions,
	SamsungPayOptions,
	PaymentStatus,
	PaymentError,
} from "./ExpoSamsungPay.types";

interface SamsungPayViewProps extends ButtonOptions {
	width?: DimensionValue;
	height?: DimensionValue;
	onPaymentCompleted?: (data: PaymentStatus) => void;
	onPaymentFailed?: (error: PaymentError) => void;
	paymentOptions?: SamsungPayOptions;
	onPress?: () => void;
}

export default function SamsungPayView(props: SamsungPayViewProps) {
	const {
		width = "100%",
		height = 50,
		type = "pay",
		style = "black",
		radius = 4,
		isLoading = false,
		isDisabled = false,
		onPaymentCompleted,
		onPaymentFailed,
		paymentOptions,
		onPress,
	} = props;

	const handlePress = useCallback(async () => {
		if (paymentOptions) {
			const response = await SamsungPayModule.initiatePayment(paymentOptions);
			if (response.success) {
				onPaymentCompleted?.(response.data);
			} else {
				onPaymentFailed?.(response.error);
			}
			return;
		}
		onPress?.();
	}, [paymentOptions, onPress, onPaymentCompleted, onPaymentFailed]);

	useEffect(() => {
		const completedSub = SamsungPayModule.addListener(
			"onPaymentCompleted",
			onPaymentCompleted || (() => {}),
		);
		const failedSub = SamsungPayModule.addListener(
			"onPaymentFailed",
			onPaymentFailed || (() => {}),
		);
		return () => {
			completedSub.remove();
			failedSub.remove();
		};
	}, [onPaymentCompleted, onPaymentFailed]);

	const buttonText =
		type === "buy"
			? "Buy with Samsung Pay"
			: type === "checkout"
				? "Checkout with Samsung Pay"
				: "Samsung Pay";

	const buttonStyles: ViewStyle = {
		width,
		height,
		borderRadius: radius,
		justifyContent: "center",
		alignItems: "center",
		flexDirection: "row",
		opacity: isDisabled || isLoading ? 0.5 : 1,
		backgroundColor:
			style === "white" ? "#FFFFFF" : style === "color" ? "#1428A0" : "#000000",
		...(style === "white" && { borderWidth: 1, borderColor: "#CCCCCC" }),
	};

	const textStyle: TextStyle = {
		color: style === "white" ? "#000000" : "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	};

	return (
		<TouchableOpacity
			style={buttonStyles}
			onPress={handlePress}
			disabled={isDisabled || isLoading}
			activeOpacity={0.8}
		>
			{isLoading ? (
				<ActivityIndicator
					color={style === "white" ? "#000000" : "#FFFFFF"}
					size="small"
				/>
			) : (
				<Text style={textStyle}>{buttonText}</Text>
			)}
		</TouchableOpacity>
	);
}
