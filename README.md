# expo-samsung-pay

A React Native Expo module that enables Samsung Pay integration for Android applications.

## Features

- Check Samsung Pay availability
- Initiate Samsung Pay payments
- Customizable payment button component
- Support for multiple payment brands (VISA, MASTERCARD, AMEX, DISCOVER, MADA)
- TypeScript support

## Installation

### 1. Install the package

```bash
npm install expo-samsung-pay
```

### 2. Download Samsung Pay SDK

**Important**: This module requires the Samsung Pay Android SDK to function properly.

1. Visit the [Samsung Pay Developer Portal](https://developer.samsung.com/pay/web/download.html#Android-SDK)
2. Download the Samsung Pay Android SDK
3. Extract the SDK and locate the `samsungpay.jar` file
4. Place the JAR file in your project (recommended: `./libs/samsungpay.jar`)

### 3. Configure your app

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-samsung-pay",
        {
          "aarPath": "./libs/samsungpay.jar"
        }
      ]
    ]
  }
}
```

**Note**: Update the `aarPath` to match where you placed the Samsung Pay SDK JAR file.

### 4. Rebuild your app

Since this involves native code changes, you'll need to rebuild your app:

```bash
npx expo run:android
```

## API Reference

### Functions

#### `canMakePayments(serviceId: string): Promise<boolean>`

Checks if Samsung Pay is available and can make payments on the device.

```typescript
import { canMakePayments } from 'expo-samsung-pay';

const checkAvailability = async () => {
  const isAvailable = await canMakePayments('YOUR_SERVICE_ID');
  console.log('Samsung Pay available:', isAvailable);
};
```

#### `initiatePayment(options: SamsungPayOptions): Promise<void>`

Initiates a Samsung Pay payment with the specified options.

```typescript
import { initiatePayment } from 'expo-samsung-pay';

const makePayment = async () => {
  try {
    await initiatePayment({
      serviceId: 'YOUR_SERVICE_ID',
      merchantName: 'Your Store',
      orderNumber: 'ORDER123',
      merchantCountryCode: 'US',
      amount: 1000, // Amount in cents
      items: [
        {
          id: 'item1',
          name: 'Product Name',
          amount: 1000,
          description: 'Product description'
        }
      ],
      supportedBrands: ['VISA', 'MASTERCARD']
    });
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

### Components

#### `SamsungPayButton`

A pre-built button component that handles Samsung Pay integration.

```typescript
import { SamsungPayButton } from 'expo-samsung-pay';

<SamsungPayButton
  serviceId="YOUR_SERVICE_ID"
  merchantName="Your Store"
  orderNumber="ORDER123"
  merchantCountryCode="US"
  amount={1000}
  items={[
    {
      id: 'item1',
      name: 'Product Name',
      amount: 1000,
      description: 'Product description'
    }
  ]}
  type="pay" // 'pay', 'buy', or 'checkout'
  style="black" // 'black', 'white', or 'color'
  onPaymentCompleted={(result) => {
    console.log('Payment completed:', result);
  }}
  onPaymentFailed={(error) => {
    console.log('Payment failed:', error);
  }}
/>
```

## Types

### `SamsungPayOptions`

```typescript
type SamsungPayOptions = {
  serviceId: string;
  merchantName: string;
  orderNumber: string;
  merchantCountryCode: string;
  amount: number;
  supportedBrands?: SupportedBrand[];
  items: Array<{
    id: string;
    name: string;
    amount: number;
    description?: string;
  }>;
};
```

### `SupportedBrand`

```typescript
type SupportedBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'MADA';
```

### `PaymentStatus`

```typescript
type PaymentStatus = {
  status: 'success' | 'error';
  credential?: string;
  errorCode?: number;
  errorDescription?: string;
};
```

### `ButtonOptions`

```typescript
type ButtonOptions = {
  type?: 'pay' | 'buy' | 'checkout';
  style?: 'black' | 'white' | 'color';
  radius?: number;
  isDisabled?: boolean;
  isLoading?: boolean;
};
```

## Complete Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { canMakePayments, SamsungPayButton } from 'expo-samsung-pay';

const SERVICE_ID = 'YOUR_SERVICE_ID';
const MERCHANT_NAME = 'Your Store Name';
const MERCHANT_COUNTRY_CODE = 'US';

export default function PaymentScreen() {
  const [canUseSamsungPay, setCanUseSamsungPay] = useState(false);

  useEffect(() => {
    checkSamsungPayAvailability();
  }, []);

  const checkSamsungPayAvailability = async () => {
    try {
      const isAvailable = await canMakePayments(SERVICE_ID);
      setCanUseSamsungPay(isAvailable);
    } catch (error) {
      console.error('Error checking Samsung Pay availability:', error);
    }
  };

  const handlePaymentCompleted = (result) => {
    Alert.alert('Success', 'Payment completed successfully!');
    console.log('Payment result:', result);
  };

  const handlePaymentFailed = (error) => {
    Alert.alert('Error', `Payment failed: ${error.errorDescription}`);
    console.error('Payment error:', error);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Samsung Pay Status: {canUseSamsungPay ? 'Available' : 'Not Available'}</Text>
      
      {canUseSamsungPay && (
        <SamsungPayButton
          serviceId={SERVICE_ID}
          merchantName={MERCHANT_NAME}
          orderNumber={`ORDER-${Date.now()}`}
          merchantCountryCode={MERCHANT_COUNTRY_CODE}
          amount={2500} // $25.00
          items={[
            {
              id: 'product1',
              name: 'Sample Product',
              amount: 2500,
              description: 'A sample product for testing'
            }
          ]}
          supportedBrands={['VISA', 'MASTERCARD', 'AMEX']}
          type="buy"
          style="black"
          onPaymentCompleted={handlePaymentCompleted}
          onPaymentFailed={handlePaymentFailed}
        />
      )}
    </View>
  );
}
```

## Platform Support

- ✅ Android
- ❌ iOS (Samsung Pay is Android-only)

The module automatically returns `false` for `canMakePayments()` on iOS and renders nothing for the `SamsungPayButton` component.

## Requirements

- Expo SDK 49+
- Android API level 23+ (Android 6.0)
- Samsung device with Samsung Pay installed
- Valid Samsung Pay service ID from Samsung Developer Portal

## Getting a Service ID

1. Register at [Samsung Pay Developer Portal](https://pay.samsung.com/developers)
2. Create a new service
3. Complete the service configuration
4. Obtain your Service ID for production use

## Troubleshooting

### "Samsung Pay AAR file not found" Error

Make sure you've downloaded the Samsung Pay SDK and placed the JAR file in the correct location specified in your `app.json` configuration.

### Samsung Pay Not Available

- Ensure the device is a Samsung device
- Verify Samsung Pay is installed and set up
- Check that the device meets minimum requirements
- Confirm your Service ID is valid

### Build Errors

- Make sure you've run `npx expo run:android` after adding the plugin
- Clean your build cache: `npx expo run:android --clear`
- Verify the Samsung Pay SDK JAR file is accessible

## Contributing

Contributions are welcome! Please read the [contributing guidelines](https://github.com/expo/expo#contributing) before submitting pull requests.

## License

MIT

## Support

For issues related to:
- This Expo module: [Create an issue](https://github.com/AlfayezDev/expo-samsung-pay/issues)
- Samsung Pay SDK: [Samsung Pay Developer Support](https://developer.samsung.com/pay)
- Expo: [Expo Documentation](https://docs.expo.dev/)
