import UIKit
import Capacitor

/// Root view controller. Registers the app's own native plugin (StoreKit 2, Face ID,
/// PDF/CSV share sheet) that lives in this target rather than in an npm package.
class InvoiceLabViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InvoiceLabNativePlugin())
    }
}
