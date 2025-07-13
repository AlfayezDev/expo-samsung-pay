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
	// Add Android manifest configuration
	config = withAndroidManifest(config, async (config) => {
		let androidManifest = config.modResults.manifest;

		// Add Samsung Pay packages to queries
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

		// Check if packages already exist before adding
		const existingPackages = androidManifest.queries[0].package.map(
			(pkg: any) => pkg.$["android:name"],
		);

		samsungPayPackages.forEach((pkg) => {
			if (!existingPackages.includes(pkg.$["android:name"]))
				androidManifest.queries[0].package?.push(pkg);
		});

		// Add meta-data for Samsung Pay SDK API level
		if (!androidManifest.application?.[0]["meta-data"]) {
			//@ts-ignore
			androidManifest.application[0]["meta-data"] = [];
		}

		const existingMeta = androidManifest.application?.[0]["meta-data"].find(
			(meta: any) => meta.$["android:name"] === "spay_sdk_api_level",
		);

		if (existingMeta) {
			existingMeta.$["android:value"] = "2.22";
		} else {
			androidManifest.application?.[0]["meta-data"].push({
				$: {
					"android:name": "spay_sdk_api_level",
					"android:value": "2.22",
				},
			});
		}

		return config;
	});

	// Handle Samsung Pay JAR file placement
	config = withDangerousMod(config, [
		"android",
		async (config) => {
			const projectRoot = config.modRequest.projectRoot;

			// Resolve the source path relative to project root
			const sourcePath = path.resolve(projectRoot, aarPath);

			// Check if we're in a monorepo setup by looking for common monorepo indicators
			const possibleMonorepoRoots = [
				path.resolve(projectRoot, ".."), // One level up
				path.resolve(projectRoot, "../.."), // Two levels up (for packages/app structure)
				path.resolve(projectRoot, "../../.."), // Three levels up (for deeply nested structures)
			];

			let actualSourcePath = sourcePath;
			let foundSourcePath = false;

			// First check the original path
			if (fs.existsSync(sourcePath)) {
				foundSourcePath = true;
			} else {
				// Check monorepo scenarios
				for (const monorepoRoot of possibleMonorepoRoots) {
					const monorepoSourcePath = path.resolve(monorepoRoot, aarPath);

					if (fs.existsSync(monorepoSourcePath)) {
						actualSourcePath = monorepoSourcePath;
						foundSourcePath = true;
						break;
					}
				}

				// Also check if the path is relative to workspace root
				const workspaceMarkers = [
					"package.json",
					"yarn.lock",
					"pnpm-lock.yaml",
					"rush.json",
					"lerna.json",
				];
				for (const monorepoRoot of possibleMonorepoRoots) {
					const hasWorkspaceMarker = workspaceMarkers.some((marker) =>
						fs.existsSync(path.join(monorepoRoot, marker)),
					);

					if (hasWorkspaceMarker) {
						const workspaceSourcePath = path.resolve(monorepoRoot, aarPath);
						if (fs.existsSync(workspaceSourcePath)) {
							actualSourcePath = workspaceSourcePath;
							foundSourcePath = true;
							break;
						}
					}
				}
			}

			if (!foundSourcePath) {
				return config;
			}

			// Verify it's actually a JAR file
			const stats = fs.statSync(actualSourcePath);

			if (!stats.isFile()) {
				return config;
			}

			if (!actualSourcePath.endsWith(".jar")) {
				return config;
			}

			console.log(`✅ Verified Samsung Pay SDK JAR file: ${actualSourcePath}`);

			// Define all target locations
			const androidProjectRoot = path.join(projectRoot, "android");

			if (!fs.existsSync(androidProjectRoot)) {
				return config;
			}

			// Multiple target locations - app libs and module libs
			const targetLocations = [
				{
					name: "App libs directory",
					dir: path.join(androidProjectRoot, "app", "libs"),
					path: path.join(androidProjectRoot, "app", "libs", "samsungpay.jar"),
					required: true,
				},
				{
					name: "Module libs directory",
					dir: path.join(
						projectRoot,
						"node_modules",
						"expo-samsung-pay",
						"android",
						"libs",
					),
					path: path.join(
						projectRoot,
						"node_modules",
						"expo-samsung-pay",
						"android",
						"libs",
						"samsungpay.jar",
					),
					required: true,
				},
				{
					name: "Alternative app libs",
					dir: path.join(androidProjectRoot, "libs"),
					path: path.join(androidProjectRoot, "libs", "samsungpay.jar"),
					required: false,
				},
			];

			// Copy to all target locations
			let copySuccessCount = 0;
			let copyFailureCount = 0;

			for (const location of targetLocations) {
				try {
					// Check if parent directory exists for required locations
					const parentDir = path.dirname(location.dir);
					if (location.required && !fs.existsSync(parentDir)) {
						continue;
					}

					// Create target directory if it doesn't exist
					if (!fs.existsSync(location.dir)) {
						fs.mkdirSync(location.dir, { recursive: true });
					} else {
					}

					// Check if target file already exists with same size
					if (fs.existsSync(location.path)) {
						const existingStats = fs.statSync(location.path);

						if (stats.size === existingStats.size) {
							copySuccessCount++;
							continue;
						} else {
						}
					}

					fs.copyFileSync(actualSourcePath, location.path);

					// Verify the copy
					if (fs.existsSync(location.path)) {
						const targetStats = fs.statSync(location.path);

						if (stats.size === targetStats.size) {
							copySuccessCount++;
						} else {
							copyFailureCount++;
						}
					} else {
						copyFailureCount++;
					}
				} catch (error) {
					if (location.required) copyFailureCount++;
				}
			}
			return config;
		},
	]);

	return config;
};

export default createRunOncePlugin(withSamsungPay, pkg.name, pkg.version);
