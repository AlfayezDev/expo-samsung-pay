import {
	createRunOncePlugin,
	withAndroidManifest,
	ConfigPlugin,
	withDangerousMod,
} from "@expo/config-plugins";
import path from "path";
import fs from "fs";

const pkg = require("expo-samsung-pay/package.json");

const withSamsungPay: ConfigPlugin<{
	aarPath?: string;
}> = (config, { aarPath = "./libs/samsungpay.jar" } = {}) => {
	config = withAndroidManifest(config, async (config) => {
		let androidManifest = config.modResults.manifest;

		if (!androidManifest.queries) {
			androidManifest.queries = [{}];
		}
		if (!androidManifest.queries[0].package) {
			androidManifest.queries[0].package = [];
		}

		const samsungPayPackages = [
			{ $: { "android:name": "com.samsung.android.spay" } },
			{ $: { "android:name": "com.samsung.android.samsungpay.gear" } },
		];

		const existingPackages = androidManifest.queries[0].package.map(
			(pkg: any) => pkg.$["android:name"],
		);

		samsungPayPackages.forEach((pkg) => {
			if (!existingPackages.includes(pkg.$["android:name"]))
				androidManifest.queries[0].package?.push(pkg);
		});

		if (!androidManifest.application?.[0]["meta-data"]) {
			//@ts-ignore
			androidManifest.application[0]["meta-data"] = [];
		}

		const existingMeta = androidManifest.application?.[0]["meta-data"].find(
			(meta: any) => meta.$["android:name"] === "spay_sdk_api_level",
		);

		if (existingMeta) {
			existingMeta.$["android:value"] = "@string/spay_sdk_api_level";
		} else {
			androidManifest.application?.[0]["meta-data"].push({
				$: {
					"android:name": "spay_sdk_api_level",
					"android:value": "@string/spay_sdk_api_level",
				},
			});
		}

		return config;
	});

	config = withDangerousMod(config, [
		"android",
		async (config) => {
			const projectRoot = config.modRequest.projectRoot;
			const resValuesDir = path.join(projectRoot, "android", "app", "src", "main", "res", "values");

			if (!fs.existsSync(resValuesDir)) {
				return config;
			}

			const resourceFilePath = path.join(resValuesDir, "samsung_pay.xml");
			const resourceContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n\t<item name="spay_sdk_api_level" type="string" format="float">2.22</item>\n</resources>\n`;

			fs.writeFileSync(resourceFilePath, resourceContent);
			return config;
		},
	]);

	config = withDangerousMod(config, [
		"android",
		async (config) => {
			const projectRoot = config.modRequest.projectRoot;
			const sourcePath = path.resolve(projectRoot, aarPath);

			let actualSourcePath = sourcePath;
			let foundSourcePath = false;

			if (fs.existsSync(sourcePath)) {
				foundSourcePath = true;
			} else {
				const possibleMonorepoRoots = [
					path.resolve(projectRoot, ".."),
					path.resolve(projectRoot, "../.."),
					path.resolve(projectRoot, "../../.."),
				];

				for (const monorepoRoot of possibleMonorepoRoots) {
					const monorepoSourcePath = path.resolve(monorepoRoot, aarPath);
					if (fs.existsSync(monorepoSourcePath)) {
						actualSourcePath = monorepoSourcePath;
						foundSourcePath = true;
						break;
					}
				}
			}

			if (!foundSourcePath) {
				return config;
			}

			const stats = fs.statSync(actualSourcePath);
			if (!stats.isFile() || !actualSourcePath.endsWith(".jar")) {
				return config;
			}

			const androidProjectRoot = path.join(projectRoot, "android");
			if (!fs.existsSync(androidProjectRoot)) {
				return config;
			}

			const targetLocations = [
				{
					dir: path.join(androidProjectRoot, "app", "libs"),
					path: path.join(androidProjectRoot, "app", "libs", "samsungpay.jar"),
					required: true,
				},
				{
					dir: path.join(projectRoot, "node_modules", "expo-samsung-pay", "android", "libs"),
					path: path.join(projectRoot, "node_modules", "expo-samsung-pay", "android", "libs", "samsungpay.jar"),
					required: true,
				},
			];

			for (const location of targetLocations) {
				try {
					const parentDir = path.dirname(location.dir);
					if (location.required && !fs.existsSync(parentDir)) {
						continue;
					}
					if (!fs.existsSync(location.dir)) {
						fs.mkdirSync(location.dir, { recursive: true });
					}
					if (fs.existsSync(location.path)) {
						const existingStats = fs.statSync(location.path);
						if (stats.size === existingStats.size) {
							continue;
						}
					}
					fs.copyFileSync(actualSourcePath, location.path);
				} catch (error) {
					// Silent fail
				}
			}
			return config;
		},
	]);

	return config;
};

export default createRunOncePlugin(withSamsungPay, pkg.name, pkg.version);
