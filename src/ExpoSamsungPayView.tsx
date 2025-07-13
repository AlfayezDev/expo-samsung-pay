import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import type { ViewStyle, TextStyle, DimensionValue } from "react-native";
import SamsungPayModule from "./ExpoSamsungPayModule";
import type {
	ButtonOptions,
	SamsungPayOptions,
	PaymentStatus,
} from "./ExpoSamsungPay.types";

interface SamsungPayViewProps extends ButtonOptions {
	width?: DimensionValue;
	height?: DimensionValue;
	onPaymentCompleted?: (status: PaymentStatus) => void;
	onPaymentFailed?: (status: PaymentStatus) => void;
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

	const handlePress = () => {
		// Prioritize paymentOptions over onPress
		if (paymentOptions) {
			SamsungPayModule.initiatePayment(paymentOptions).catch((error: any) => {
				onPaymentFailed?.({
					status: "error",
					errorDescription: error.message || "Payment failed",
				});
			});
			return;
		}

		if (onPress) {
			onPress();
		}
	};

	React.useEffect(() => {
		const paymentSub = SamsungPayModule.addListener(
			"onPaymentCompleted",
			(event: PaymentStatus) => {
				if (event.status === "success") {
					onPaymentCompleted?.(event);
				} else {
					onPaymentFailed?.(event);
				}
			},
		);
		const failedSub = SamsungPayModule.addListener(
			"onPaymentFailed",
			onPaymentFailed || (() => {}),
		);
		return () => {
			paymentSub.remove();
			failedSub.remove();
		};
	}, [onPaymentCompleted, onPaymentFailed]);

	const getButtonText = () => {
		switch (type) {
			case "buy":
				return "Buy with Samsung Pay";
			case "checkout":
				return "Checkout with Samsung Pay";
			default:
				return "Samsung Pay";
		}
	};

	const getButtonStyles = (): ViewStyle => {
		const baseStyle: ViewStyle = {
			width,
			height,
			borderRadius: radius,
			justifyContent: "center",
			alignItems: "center",
			flexDirection: "row",
			opacity: isDisabled || isLoading ? 0.5 : 1,
		};
		switch (style) {
			case "white":
				return {
					...baseStyle,
					backgroundColor: "#FFFFFF",
					borderWidth: 1,
					borderColor: "#CCCCCC",
				};
			case "color":
				return {
					...baseStyle,
					backgroundColor: "#1428A0",
				};
			default:
				return {
					...baseStyle,
					backgroundColor: "#000000",
				};
		}
	};

	const getTextStyle = (): TextStyle => ({
		color: style === "white" ? "#000000" : "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	});

	return (
		<TouchableOpacity
			style={getButtonStyles()}
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
				<Text style={getTextStyle()}>{getButtonText()}</Text>
			)}
		</TouchableOpacity>
	);
}
