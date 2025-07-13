package dev.alfayez.expo.samsungpay

import android.os.Bundle
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.samsung.android.sdk.samsungpay.v2.PartnerInfo
import com.samsung.android.sdk.samsungpay.v2.SamsungPay
import com.samsung.android.sdk.samsungpay.v2.SpaySdk
import com.samsung.android.sdk.samsungpay.v2.StatusListener
import com.samsung.android.sdk.samsungpay.v2.payment.CardInfo
import com.samsung.android.sdk.samsungpay.v2.payment.CustomSheetPaymentInfo
import com.samsung.android.sdk.samsungpay.v2.payment.PaymentManager
import com.samsung.android.sdk.samsungpay.v2.payment.sheet.AmountBoxControl
import com.samsung.android.sdk.samsungpay.v2.payment.sheet.AmountConstants
import com.samsung.android.sdk.samsungpay.v2.payment.sheet.CustomSheet
class ExpoSamsungPayModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private var paymentManager: PaymentManager? = null
  private val TAG = "SamsungPayModule"
  override fun definition() = ModuleDefinition {
    Events("onPaymentCompleted", "onPaymentFailed")
    AsyncFunction("canMakePayments") { serviceId: String, promise: Promise ->
      val bundle = Bundle().apply {
        putString(
          SpaySdk.PARTNER_SERVICE_TYPE,
          SpaySdk.ServiceType.INAPP_PAYMENT.toString()
        )
      }
      val partnerInfo = PartnerInfo(serviceId, bundle)
      val samsungPay = SamsungPay(context, partnerInfo)
      samsungPay.getSamsungPayStatus(object : StatusListener {
        override fun onSuccess(status: Int, bundle: Bundle) {
          if (status == SpaySdk.SPAY_NOT_READY) {
            samsungPay.activateSamsungPay()
          }
          promise.resolve(status == SpaySdk.SPAY_READY)
        }

        override fun onFail(errorCode: Int, bundle: Bundle) {
          promise.resolve(false)
        }
      })
    }
    AsyncFunction("initiatePayment") { options: Map<String, Any> ->
      val serviceId = options["serviceId"] as String
      val merchantName = options["merchantName"] as? String
      val merchantCountryCode = options["merchantCountryCode"] as? String
      val orderNumber = options["orderNumber"] as? String
      val amount = (options["amount"] as Number).toDouble()

      // Validation
      if (orderNumber.isNullOrEmpty() || merchantCountryCode.isNullOrEmpty() || merchantName.isNullOrEmpty()) {
        sendEvent(
          "onPaymentFailed", mapOf(
            "status" to "error",
            "errorDescription" to "orderNumber, merchantCountryCode, and merchantName required"
          )
        )
        return@AsyncFunction
      }

      @Suppress("UNCHECKED_CAST")
      val items = options["items"] as? List<Map<String, Any>> ?: emptyList()

      @Suppress("UNCHECKED_CAST")
      val allowedBrands = options["allowedCardBrands"] as? List<String> ?: listOf("VISA", "MASTERCARD", "MADA")

      val bundle = Bundle().apply {
        putString(
          SpaySdk.PARTNER_SERVICE_TYPE,
          SpaySdk.ServiceType.INAPP_PAYMENT.toString()
        )
      }
      val partnerInfo = PartnerInfo(serviceId, bundle)
      paymentManager = PaymentManager(context, partnerInfo)

      // Build AmountBoxControl
      val amountBoxControl = AmountBoxControl("AMOUNT_CONTROL_ID", "SAR")
      items.forEach { item ->
        amountBoxControl.addItem(
          item["id"] as String,
          item["name"] as String,
          (item["amount"] as Number).toDouble(),
          item["description"] as? String ?: ""
        )
      }
      amountBoxControl.setAmountTotal(amount, AmountConstants.FORMAT_TOTAL_PRICE_ONLY)

      val customSheet = CustomSheet().apply {
        addControl(amountBoxControl)
      }

      // Validate and convert brand list
      val brandList = try {
        validateAndConvertBrands(allowedBrands)
      } catch (e: IllegalArgumentException) {
        sendEvent(
          "onPaymentFailed", mapOf(
            "status" to "error",
            "errorDescription" to e.message
          )
        )
        return@AsyncFunction
      }

      val customSheetPaymentInfo = CustomSheetPaymentInfo.Builder()
        .setMerchantName(merchantName)
        .setOrderNumber(orderNumber)
        .setMerchantCountryCode(merchantCountryCode)
        .setAddressInPaymentSheet(CustomSheetPaymentInfo.AddressInPaymentSheet.DO_NOT_SHOW)
        .setAllowedCardBrands(brandList)
        .setCardHolderNameEnabled(true)
        .setRecurringEnabled(false)
        .setCustomSheet(customSheet)
        .build()

      paymentManager?.startInAppPayWithCustomSheet(
        customSheetPaymentInfo,
        object : PaymentManager.CustomSheetTransactionInfoListener {
          override fun onSuccess(
            response: CustomSheetPaymentInfo,
            paymentCredential: String,
            extraPaymentData: Bundle
          ) {
            sendEvent(
              "onPaymentCompleted", mapOf(
                "status" to "success",
                "credential" to paymentCredential
              )
            )
          }

          override fun onFailure(errorCode: Int, errorData: Bundle) {
            val bundleData = errorData.keySet().joinToString { key ->
              "$key=${errorData.getString(key)}"
            }

            val detailedError = when (errorCode) {
              SpaySdk.ERROR_INVALID_PARAMETER -> {
                val errorReason = errorData.getString("errorReason") ?: "unknown"
                val errorMessage =
                  errorData.getString("errorReasonMessage") ?: "invalid parameter"
                "Invalid parameter: $errorReason - $errorMessage"
              }

              else -> "Error code: $errorCode"
            }

            Log.e(TAG, "Payment failure: $detailedError | Bundle: [$bundleData]")

            sendEvent(
              "onPaymentFailed", mapOf(
                "status" to "error",
                "errorCode" to errorCode,
                "errorDescription" to detailedError,
                "bundleData" to bundleData
              )
            )
          }

          override fun onCardInfoUpdated(
            selectedCardInfo: CardInfo,
            customSheet: CustomSheet
          ) {
            paymentManager?.updateSheet(customSheet)
          }
        }
      )

    }
    Name("ExpoSamsungPay")

  }
  private fun validateAndConvertBrands(brandStrings: List<String>): ArrayList<SpaySdk.Brand> {
    val validBrands = mapOf(
      "VISA" to SpaySdk.Brand.VISA,
      "MASTERCARD" to SpaySdk.Brand.MASTERCARD,
      "MADA" to SpaySdk.Brand.MADA,
      "DISCOVER" to SpaySdk.Brand.DISCOVER,
    )

    if (brandStrings.isEmpty()) {
      throw IllegalArgumentException("allowedCardBrands cannot be empty")
    }

    val convertedBrands = arrayListOf<SpaySdk.Brand>()
    val invalidBrands = mutableListOf<String>()

    brandStrings.forEach { brandString ->
      val brand = validBrands[brandString.uppercase()]
      if (brand != null) {
        convertedBrands.add(brand)
      } else {
        invalidBrands.add(brandString)
      }
    }

    if (invalidBrands.isNotEmpty()) {
      val validBrandNames = validBrands.keys.joinToString(", ")
      throw IllegalArgumentException("Invalid card brands: ${invalidBrands.joinToString(", ")}. Valid brands: $validBrandNames")
    }

    return convertedBrands
  }
}
