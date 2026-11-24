import Foundation
import UIKit
import Capacitor
import StoreKit
import LocalAuthentication

/// Invoice Laboratory native bridge (JS name: "InvoiceLabNative").
///
/// - StoreKit 2 auto-renewable subscription "Invoice Lab Pro" (monthly / yearly, 14-day free trial
///   as the introductory offer). Purchase, Restore Purchases, current entitlements and a
///   `Transaction.updates` listener. The signed JWS of every verified transaction is handed to the
///   web layer so the backend can verify it with Apple's certificate chain and unlock Pro on the
///   account (App Review Guideline 3.1.1). No third-party SDK.
/// - App lock with Face ID / Touch ID / device passcode (LocalAuthentication).
/// - Invoice PDF export: renders the current invoice page with its print stylesheet into a
///   paginated US Letter PDF and opens the iOS share sheet (Mail, Messages, AirDrop, Files, Print).
/// - CSV / JSON export through the share sheet.
@objc(InvoiceLabNativePlugin)
public class InvoiceLabNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InvoiceLabNativePlugin"
    public let jsName = "InvoiceLabNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "biometryInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sharePdf", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Finish transactions that arrive outside a purchase call (renewals, Ask to Buy approvals,
        // purchases on another device, refunds/revocations) and tell the web layer so it can
        // re-sync the account entitlement with the backend.
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                let entitlements = await InvoiceLabNativePlugin.currentEntitlements()
                self?.notifyListeners("entitlementsChanged", data: ["entitlements": entitlements])
            }
        }
    }

    deinit { updatesTask?.cancel() }

    // MARK: - StoreKit 2

    /// Active (non-revoked, non-expired) verified entitlements with their signed JWS.
    static func currentEntitlements() async -> [[String: Any]] {
        var out: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let t) = result, t.revocationDate == nil else { continue }
            if let exp = t.expirationDate, exp < Date() { continue }
            var row: [String: Any] = [
                "productId": t.productID,
                "originalTransactionId": String(t.originalID),
                "transactionId": String(t.id),
                "jws": result.jwsRepresentation,
            ]
            if let exp = t.expirationDate { row["expiresAt"] = ISO8601DateFormatter().string(from: exp) }
            out.append(row)
        }
        return out
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                var rows: [[String: Any]] = []
                for p in products {
                    var row: [String: Any] = [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "displayPrice": p.displayPrice,
                        "price": NSDecimalNumber(decimal: p.price).doubleValue,
                    ]
                    if let sub = p.subscription {
                        row["period"] = InvoiceLabNativePlugin.describe(sub.subscriptionPeriod)
                        row["eligibleForIntroOffer"] = await sub.isEligibleForIntroOffer
                        if let intro = sub.introductoryOffer {
                            row["introOffer"] = [
                                "paymentMode": InvoiceLabNativePlugin.describe(intro.paymentMode),
                                "period": InvoiceLabNativePlugin.describe(intro.period),
                                "displayPrice": intro.displayPrice,
                            ]
                        }
                    }
                    rows.append(row)
                }
                call.resolve(["products": rows])
            } catch {
                call.reject("Could not load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("productId") else { call.reject("productId is required"); return }
        let token = call.getString("appAccountToken").flatMap { UUID(uuidString: $0) }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Product not found"); return
                }
                var options: Set<Product.PurchaseOption> = []
                if let token = token { options.insert(.appAccountToken(token)) }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve([
                            "status": "purchased",
                            "jws": verification.jwsRepresentation,
                            "entitlements": await InvoiceLabNativePlugin.currentEntitlements(),
                        ])
                    case .unverified(_, let err):
                        call.reject("Purchase could not be verified: \(err.localizedDescription)")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            // The user may cancel the App Store sign-in sheet; still report what we have.
            do { try await AppStore.sync() } catch {}
            call.resolve(["entitlements": await InvoiceLabNativePlugin.currentEntitlements()])
        }
    }

    @objc func entitlements(_ call: CAPPluginCall) {
        Task { call.resolve(["entitlements": await InvoiceLabNativePlugin.currentEntitlements()]) }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No active window"); return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("Could not open subscriptions: \(error.localizedDescription)")
            }
        }
    }

    static func describe(_ period: Product.SubscriptionPeriod) -> [String: Any] {
        let unit: String
        switch period.unit {
        case .day: unit = "day"
        case .week: unit = "week"
        case .month: unit = "month"
        case .year: unit = "year"
        @unknown default: unit = "unknown"
        }
        return ["unit": unit, "value": period.value]
    }

    static func describe(_ mode: Product.SubscriptionOffer.PaymentMode) -> String {
        switch mode {
        case .freeTrial: return "freeTrial"
        case .payAsYouGo: return "payAsYouGo"
        case .payUpFront: return "payUpFront"
        default: return "unknown"
        }
    }

    // MARK: - App lock

    @objc func biometryInfo(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let canUse = ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err)
        let type: String
        switch ctx.biometryType {
        case .faceID: type = "faceId"
        case .touchID: type = "touchId"
        default: type = "passcode"
        }
        call.resolve(["available": canUse, "type": type])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Invoice Lab"
        let ctx = LAContext()
        ctx.localizedCancelTitle = "Cancel"
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
            if ok { call.resolve(["ok": true]) }
            else { call.resolve(["ok": false, "error": error?.localizedDescription ?? "cancelled"]) }
        }
    }

    // MARK: - Share sheet exports

    static func safeFileName(_ raw: String, ext: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: " -_."))
        var name = String(raw.unicodeScalars.filter { allowed.contains($0) }).trimmingCharacters(in: .whitespaces)
        if name.isEmpty { name = "Invoice" }
        if name.count > 80 { name = String(name.prefix(80)) }
        return name.lowercased().hasSuffix(".\(ext)") ? name : "\(name).\(ext)"
    }

    /// Renders what is on screen (print stylesheet applied) into a paginated US Letter PDF and
    /// opens the share sheet. Replaces window.print(), which WKWebView does not implement.
    @objc func sharePdf(_ call: CAPPluginCall) {
        let fileName = InvoiceLabNativePlugin.safeFileName(call.getString("fileName") ?? "Invoice", ext: "pdf")
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else { call.reject("No web view"); return }
            let renderer = UIPrintPageRenderer()
            renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
            let paper = CGRect(x: 0, y: 0, width: 612, height: 792) // US Letter, 72 dpi
            renderer.setValue(NSValue(cgRect: paper), forKey: "paperRect")
            renderer.setValue(NSValue(cgRect: paper.insetBy(dx: 36, dy: 36)), forKey: "printableRect")
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, paper, [kCGPDFContextTitle as String: fileName])
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
            let bounds = UIGraphicsGetPDFContextBounds()
            for page in 0..<renderer.numberOfPages {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: page, in: bounds)
            }
            UIGraphicsEndPDFContext()
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
            do {
                try data.write(to: url, options: .atomic)
            } catch {
                call.reject("Could not write PDF: \(error.localizedDescription)"); return
            }
            self.presentShareSheet(url: url, call: call)
        }
    }

    @objc func shareFile(_ call: CAPPluginCall) {
        guard let content = call.getString("content") else { call.reject("content is required"); return }
        let raw = call.getString("fileName") ?? "export.csv"
        let ext = (raw as NSString).pathExtension.isEmpty ? "txt" : (raw as NSString).pathExtension
        let fileName = InvoiceLabNativePlugin.safeFileName((raw as NSString).deletingPathExtension, ext: ext)
        let data: Data?
        if call.getString("encoding") == "base64" { data = Data(base64Encoded: content) } else { data = content.data(using: .utf8) }
        guard let bytes = data else { call.reject("Invalid content"); return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        do { try bytes.write(to: url, options: .atomic) } catch {
            call.reject("Could not write file: \(error.localizedDescription)"); return
        }
        DispatchQueue.main.async { self.presentShareSheet(url: url, call: call) }
    }

    private func presentShareSheet(url: URL, call: CAPPluginCall) {
        guard let vc = self.bridge?.viewController else { call.reject("No view controller"); return }
        let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        sheet.completionWithItemsHandler = { activity, completed, _, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["completed": completed, "activityType": activity?.rawValue ?? ""])
        }
        if let pop = sheet.popoverPresentationController { // iPad
            pop.sourceView = vc.view
            pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        vc.present(sheet, animated: true)
    }
}
