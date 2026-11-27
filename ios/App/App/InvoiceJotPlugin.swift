import Foundation
import UIKit
import Capacitor
import StoreKit

/// Invoice Jot's native bridge, exposed to JavaScript as `InvoiceJotStore`
/// (mobile/src/lib/storekit.ts). Registered in `BridgeViewController.capacitorDidLoad()`
/// because it lives in the App target rather than in an npm package.
///
/// - StoreKit 2 auto-renewable subscription "Invoice Jot Pro" (monthly / yearly, no free trial).
///   Purchase, Restore Purchases (AppStore.sync), current entitlements, Manage Subscriptions and a
///   `Transaction.updates` listener. Entitlements are read on-device; there is no account or server.
/// - App Store review prompt (`AppStore.requestReview` / `SKStoreReviewController`), asked only
///   after the user marks an invoice paid.
@objc(InvoiceJotPlugin)
public class InvoiceJotPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InvoiceJotPlugin"
    public let jsName = "InvoiceJotStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Renewals, Ask to Buy approvals, purchases on another device, refunds and revocations.
        updatesTask = Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                let ids = await InvoiceJotPlugin.activeProductIds()
                self?.notifyListeners("entitlementsUpdated", data: ["activeProductIds": ids])
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - StoreKit 2

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        guard !ids.isEmpty else {
            call.reject("productIds is required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: ids)
                call.resolve(["products": products.map(InvoiceJotPlugin.serialize)])
            } catch {
                call.reject("Could not load products: \(error.localizedDescription)", "LOAD_FAILED", error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("productId is required")
            return
        }
        Task { @MainActor in
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("That plan is not available right now. Please try again later.", "NOT_FOUND")
                    return
                }
                let result: Product.PurchaseResult
                if #available(iOS 17.0, *), let scene = self.bridge?.viewController?.view.window?.windowScene {
                    result = try await product.purchase(confirmIn: scene)
                } else {
                    result = try await product.purchase()
                }
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "status": "purchased",
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID
                        ])
                    case .unverified(_, let verificationError):
                        call.reject("The purchase could not be verified: \(verificationError.localizedDescription)", "UNVERIFIED", verificationError)
                    }
                case .userCancelled:
                    call.resolve(["status": "userCancelled", "productId": productId])
                case .pending:
                    call.resolve(["status": "pending", "productId": productId])
                @unknown default:
                    call.resolve(["status": "unknown", "productId": productId])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)", "PURCHASE_FAILED", error)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
            } catch {
                // Thrown if the user cancels the App Store sign-in sheet; still report what is on device.
                let ids = await InvoiceJotPlugin.activeProductIds()
                call.resolve(["activeProductIds": ids, "syncError": error.localizedDescription])
                return
            }
            let ids = await InvoiceJotPlugin.activeProductIds()
            call.resolve(["activeProductIds": ids])
        }
    }

    @objc func getEntitlements(_ call: CAPPluginCall) {
        Task {
            let ids = await InvoiceJotPlugin.activeProductIds()
            call.resolve(["activeProductIds": ids])
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            if let scene = self.bridge?.viewController?.view.window?.windowScene {
                do {
                    try await AppStore.showManageSubscriptions(in: scene)
                    call.resolve()
                    return
                } catch {
                    // fall through to the Settings URL
                }
            }
            if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                _ = await UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }

    // MARK: - Review prompt

    @objc func requestReview(_ call: CAPPluginCall) {
        Task { @MainActor in
            if let scene = self.bridge?.viewController?.view.window?.windowScene {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            call.resolve()
        }
    }

    // MARK: - Helpers

    static func activeProductIds() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if transaction.revocationDate != nil { continue }
            if let exp = transaction.expirationDate, exp < Date() { continue }
            ids.append(transaction.productID)
        }
        return ids
    }

    static func serialize(_ product: Product) -> [String: Any] {
        var period = ""
        if let sub = product.subscription {
            let unit: String
            switch sub.subscriptionPeriod.unit {
            case .day: unit = "D"
            case .week: unit = "W"
            case .month: unit = "M"
            case .year: unit = "Y"
            @unknown default: unit = "M"
            }
            period = "P\(sub.subscriptionPeriod.value)\(unit)"
        }
        return [
            "id": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
            "period": period
        ]
    }
}
