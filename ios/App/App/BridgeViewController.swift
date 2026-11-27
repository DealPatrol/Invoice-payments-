import UIKit
import Capacitor

/// Root view controller. Registers Invoice Jot's in-target native plugin
/// (StoreKit 2 subscriptions + App Store review prompt).
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InvoiceJotPlugin())
    }
}
