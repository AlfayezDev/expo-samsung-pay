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

data class PaymentError(
 val code: String,
 val message: String,
 val recoverable: Boolean = false,
 val details: Map<String, Any>? = null
) {
 fun toMap(): Map<String, Any> = mapOf(
   "code" to code,
   "message" to message,
   "recoverable" to recoverable,
   "details" to (details ?: emptyMap<String, Any>())
 )
}

object ErrorCode {
 const val VALIDATION = "VALIDATION_ERROR"
 const val NETWORK = "NETWORK_ERROR"
 const val NOT_SUPPORTED = "NOT_SUPPORTED"
 const val USER_CANCELED = "USER_CANCELED"
 const val AUTH_FAILED = "AUTH_FAILED"
 const val CONFIG_ERROR = "CONFIG_ERROR"
 const val SDK_ERROR = "SDK_ERROR"
 const val UNKNOWN = "UNKNOWN_ERROR"
}

object Validator {
 fun serviceId(value: String?): PaymentError? {
   if (value.isNullOrBlank()) return PaymentError(ErrorCode.VALIDATION, "Service ID required")
   if (!value.matches(Regex("^[A-Za-z0-9_-]+$"))) return PaymentError(ErrorCode.VALIDATION, "Invalid service ID format")
   return null
 }

 fun amount(value: Double?): PaymentError? {
   if (value == null || value <= 0) return PaymentError(ErrorCode.VALIDATION, "Invalid amount")
   if (value > 999999999.99) return PaymentError(ErrorCode.VALIDATION, "Amount exceeds limit")
   return null
 }

 fun merchant(name: String?, countryCode: String?): PaymentError? {
   if (name.isNullOrBlank()) return PaymentError(ErrorCode.VALIDATION, "Merchant name required")
   if (name.length > 100) return PaymentError(ErrorCode.VALIDATION, "Merchant name too long")
   if (countryCode !== null && !countryCode.matches(Regex("^[A-Z]{2}$"))) return PaymentError(ErrorCode.VALIDATION, "Invalid country code")
   return null
 }

 fun orderNumber(value: String?): PaymentError? {
   if (value.isNullOrBlank()) return PaymentError(ErrorCode.VALIDATION, "Order number required")
   if (value.length > 50) return PaymentError(ErrorCode.VALIDATION, "Order number too long")
   return null
 }

 fun items(items: List<Map<String, Any>>?): PaymentError? {
   items?.forEachIndexed { index, item ->
     if (item["id"] as? String == null) return PaymentError(ErrorCode.VALIDATION, "Item $index: ID required")
     if (item["name"] as? String == null) return PaymentError(ErrorCode.VALIDATION, "Item $index: Name required")
     val amount = item["amount"] as? Number
     if (amount == null || amount.toDouble() < 0) return PaymentError(ErrorCode.VALIDATION, "Item $index: Invalid amount")
   }
   return null
 }
}

object ErrorMapper {
 fun fromSdk(code: Int, bundle: Bundle): PaymentError {
   return when (code) {
     SpaySdk.ERROR_NO_NETWORK -> PaymentError(
       ErrorCode.NETWORK,
       "No network connection",
       recoverable = true
     )
     SpaySdk.SPAY_NOT_SUPPORTED -> PaymentError(
       ErrorCode.NOT_SUPPORTED,
       "Samsung Pay not supported on device"
     )
     SpaySdk.ERROR_USER_CANCELED -> PaymentError(
       ErrorCode.USER_CANCELED,
       "Payment canceled",
       recoverable = true
     )
     SpaySdk.ERROR_INVALID_PARAMETER -> PaymentError(
       ErrorCode.VALIDATION,
       bundle.getString("errorReasonMessage") ?: "Invalid parameter",
       recoverable = true,
       details = mapOf("reason" to (bundle.getString("errorReason") ?: "unknown"))
     )
     SpaySdk.ERROR_SPAY_APP_NEED_TO_UPDATE -> PaymentError(
       ErrorCode.CONFIG_ERROR,
       "Samsung Pay app needs update",
       recoverable = true
     )
     SpaySdk.ERROR_SPAY_SETUP_NOT_COMPLETED -> PaymentError(
       ErrorCode.CONFIG_ERROR,
       "Samsung Pay setup incomplete",
       recoverable = true
     )
     SpaySdk.ERROR_UNAUTHORIZED_REQUEST_TYPE,
     SpaySdk.ERROR_NOT_ALLOWED,
     SpaySdk.ERROR_PARTNER_NOT_APPROVED,
     SpaySdk.ERROR_EXPIRED_OR_INVALID_DEBUG_KEY,
     SpaySdk.ERROR_UNABLE_TO_VERIFY_CALLER,
     SpaySdk.ERROR_PARTNER_APP_SIGNATURE_MISMATCH -> PaymentError(
       ErrorCode.AUTH_FAILED,
       "Authentication failed"
     )
     SpaySdk.ERROR_INVALID_INPUT -> PaymentError(
       ErrorCode.VALIDATION,
       "Invalid card selected",
       recoverable = true
     )
     else -> PaymentError(
       ErrorCode.SDK_ERROR,
       "Samsung Pay error",
       details = mapOf("code" to code)
     )
   }
 }
}

class ExpoSamsungPayModule : Module() {
 private val context get() = requireNotNull(appContext.reactContext)
 private var paymentManager: PaymentManager? = null
 private var samsungPay: SamsungPay? = null
 private val TAG = "SamsungPay"

 override fun definition() = ModuleDefinition {
   Events("onPaymentCompleted", "onPaymentFailed", "onPaymentStatusChanged")

   AsyncFunction("canMakePayments") { serviceId: String, promise: Promise ->
     Validator.serviceId(serviceId)?.let { error ->
       return@AsyncFunction promise.resolve(mapOf(
         "success" to false,
         "error" to error.toMap()
       ))
     }

     val bundle = Bundle().apply {
       putString(SpaySdk.PARTNER_SERVICE_TYPE, SpaySdk.ServiceType.INAPP_PAYMENT.toString())
     }
     val partnerInfo = PartnerInfo(serviceId, bundle)
     samsungPay = SamsungPay(context, partnerInfo)

     samsungPay?.getSamsungPayStatus(object : StatusListener {
       override fun onSuccess(status: Int, bundle: Bundle) {
         promise.resolve(mapOf(
           "success" to true,
           "data" to mapOf(
             "canMakePayments" to (status == SpaySdk.SPAY_READY),
             "status" to getStatusString(status),
             "needsActivation" to (status == SpaySdk.SPAY_NOT_READY)
           )
         ))
         
         if (status == SpaySdk.SPAY_NOT_READY) {
           samsungPay?.activateSamsungPay()
         }
       }

       override fun onFail(errorCode: Int, bundle: Bundle) {
         val error = ErrorMapper.fromSdk(errorCode, bundle)
         promise.resolve(mapOf(
           "success" to false,
           "error" to error.toMap()
         ))
       }
     })
   }

   AsyncFunction("initiatePayment") { options: Map<String, Any>, promise: Promise ->
     val serviceId = options["serviceId"] as? String
     val merchantName = options["merchantName"] as? String
     val merchantCountryCode = options["merchantCountryCode"] as? String
     val orderNumber = options["orderNumber"] as? String
     val amount = (options["amount"] as? Number)?.toDouble()

     @Suppress("UNCHECKED_CAST")
     val items = options["items"] as? List<Map<String, Any>> ?: emptyList()
     
     @Suppress("UNCHECKED_CAST")
     val allowedBrands = options["allowedCardBrands"] as? List<String> ?: listOf("VISA", "MASTERCARD")

     listOf(
       Validator.serviceId(serviceId),
       Validator.amount(amount),
       Validator.merchant(merchantName, merchantCountryCode),
       Validator.orderNumber(orderNumber),
       Validator.items(items)
     ).firstOrNull()?.let { error ->
       return@AsyncFunction promise.resolve(mapOf(
         "success" to false,
         "error" to error.toMap()
       ))
     }

     val bundle = Bundle().apply {
       putString(SpaySdk.PARTNER_SERVICE_TYPE, SpaySdk.ServiceType.INAPP_PAYMENT.toString())
     }
     val partnerInfo = PartnerInfo(serviceId!!, bundle)
     paymentManager = PaymentManager(context, partnerInfo)

     val amountBoxControl = buildAmountControl(items, amount!!)
     val customSheet = CustomSheet().apply { addControl(amountBoxControl) }
     val brandList = convertBrands(allowedBrands)

     val paymentInfo = CustomSheetPaymentInfo.Builder()
       .setMerchantName(merchantName!!)
       .setOrderNumber(orderNumber!!)
       .setMerchantCountryCode(merchantCountryCode!!)
       .setAddressInPaymentSheet(CustomSheetPaymentInfo.AddressInPaymentSheet.DO_NOT_SHOW)
       .setAllowedCardBrands(brandList)
       .setCardHolderNameEnabled(true)
       .setRecurringEnabled(false)
       .setCustomSheet(customSheet)
       .build()

     paymentManager?.startInAppPayWithCustomSheet(
       paymentInfo,
       createPaymentListener(promise)
     )
   }

   AsyncFunction("cleanup") {
     paymentManager = null
     samsungPay = null
   }

   Name("ExpoSamsungPay")
 }

 private fun createPaymentListener(promise: Promise): PaymentManager.CustomSheetTransactionInfoListener {
   return object : PaymentManager.CustomSheetTransactionInfoListener {
     override fun onCardInfoUpdated(cardInfo: CardInfo?, customSheet: CustomSheet?) {}

     override fun onSuccess(
       response: CustomSheetPaymentInfo,
       paymentCredential: String,
       extraPaymentData: Bundle
     ) {
       val result = mapOf(
         "status" to "success",
         "credential" to paymentCredential,
         "orderNumber" to response.orderNumber,
         "merchantName" to response.merchantName,
         "timestamp" to System.currentTimeMillis(),
         "extraData" to bundleToMap(extraPaymentData)
       )
       
       sendEvent("onPaymentCompleted", result)
       promise.resolve(mapOf(
         "success" to true,
         "data" to result
       ))
     }

     override fun onFailure(errorCode: Int, errorData: Bundle) {
       val error = ErrorMapper.fromSdk(errorCode, errorData)
       sendEvent("onPaymentFailed", error.toMap())
       promise.resolve(mapOf(
         "success" to false,
         "error" to error.toMap()
       ))
     }
   }
 }

 private fun buildAmountControl(items: List<Map<String, Any>>, totalAmount: Double): AmountBoxControl {
   val control = AmountBoxControl("AMOUNT_CONTROL_ID", "SAR")
   
   items.forEach { item ->
     control.addItem(
       item["id"] as String,
       item["name"] as String,
       (item["amount"] as Number).toDouble(),
       item["description"] as? String ?: ""
     )
   }
   
   control.setAmountTotal(totalAmount, AmountConstants.FORMAT_TOTAL_PRICE_ONLY)
   return control
 }

 private fun convertBrands(brandStrings: List<String>): ArrayList<SpaySdk.Brand> {
   val brandMap = mapOf(
     "VISA" to SpaySdk.Brand.VISA,
     "MASTERCARD" to SpaySdk.Brand.MASTERCARD,
     "MADA" to SpaySdk.Brand.MADA,
     "DISCOVER" to SpaySdk.Brand.DISCOVER,
     "AMEX" to SpaySdk.Brand.AMERICANEXPRESS,
     "AMERICANEXPRESS" to SpaySdk.Brand.AMERICANEXPRESS
   )

   return ArrayList(brandStrings.mapNotNull { brandMap[it.uppercase()] })
 }

 private fun getStatusString(status: Int): String = when (status) {
   SpaySdk.SPAY_READY -> "READY"
   SpaySdk.SPAY_NOT_READY -> "NOT_READY"
   SpaySdk.SPAY_NOT_SUPPORTED -> "NOT_SUPPORTED"
   else -> "UNKNOWN"
 }

 private fun bundleToMap(bundle: Bundle): Map<String, Any> {
   return bundle.keySet().associate { key -> key to (bundle.get(key) ?: "null") }
 }
}
