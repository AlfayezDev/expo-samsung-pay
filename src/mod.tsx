import { Platform } from "react-native";
import type { ButtonProps } from "./ExpoSamsungPay.types";

export async function canMakePayments(_: string): Promise<boolean> {
	if (Platform.OS !== "android") return false;

	return false;
}

export const SamsungPayButton = (_: ButtonProps) => {
	return null;
};
