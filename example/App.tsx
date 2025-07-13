import { canMakePayments, SamsungPayButton } from "expo-samsung-pay";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

const SERVICE_ID = "SERVICE_ID";
const MERCHANT_NAME = "MERCHANT_NAME";
const MERCHANT_COUNTRY_CODE = "SA";
export default function App() {
	const [canUseSamsungPay, setCanUseSamsungPay] = useState(false);
	useEffect(() => {
		(async () => {
			const _canUseSamsungPay = await canMakePayments(SERVICE_ID);
			setCanUseSamsungPay(_canUseSamsungPay);
		})();
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.container}>
				<Text style={styles.header}>Samsung pay example</Text>
				<Group name="Functions">
					<Text style={{ color: canUseSamsungPay ? "green" : "red" }}>
						Can use samsung pay : {canUseSamsungPay ? "YES" : "NO"}
					</Text>
				</Group>
				<Group name="Async functions">
					{canUseSamsungPay ? (
						<SamsungPayButton
							items={[]}
							amount={1000}
							serviceId={SERVICE_ID}
							orderNumber="125125125"
							merchantName={MERCHANT_NAME}
							merchantCountryCode={MERCHANT_COUNTRY_CODE}
						/>
					) : (
						<Text>Can not use samsung pay</Text>
					)}
				</Group>
			</ScrollView>
		</SafeAreaView>
	);
}

function Group(props: { name: string; children: React.ReactNode }) {
	return (
		<View style={styles.group}>
			<Text style={styles.groupHeader}>{props.name}</Text>
			{props.children}
		</View>
	);
}

const styles = {
	header: {
		fontSize: 30,
		margin: 20,
	},
	groupHeader: {
		fontSize: 20,
		marginBottom: 20,
	},
	group: {
		margin: 20,
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 20,
	},
	container: {
		flex: 1,
		backgroundColor: "#eee",
	},
	view: {
		flex: 1,
		height: 200,
	},
};
