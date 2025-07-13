import { requireNativeModule } from "expo";
import type { SamsungPayOptions } from "./ExpoSamsungPay.types";

declare class SamsungPayModule {
	canMakePayments: (serviceId: string) => Promise<boolean>;
	initiatePayment: (options: SamsungPayOptions) => Promise<void>;
	addListener: (
		eventName: string,
		listener: (event: any) => void,
	) => { remove: () => void };
}

// This call loads the native module object from the JSI.
export default requireNativeModule<SamsungPayModule>("ExpoSamsungPay");
