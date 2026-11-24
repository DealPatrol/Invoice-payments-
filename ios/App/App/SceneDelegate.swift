import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var privacyCover: UIView?

    // Installed before iOS takes its app-switcher snapshot so invoice amounts and client names
    // never show in the multitasking view. The optional Face ID lock is handled by the web layer
    // (components/native/NativeBridge.tsx) when the app becomes active again.
    func sceneWillResignActive(_ scene: UIScene) {
        guard privacyCover == nil, let window = window else { return }
        let cover = UIView(frame: window.bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor(red: 140/255, green: 74/255, blue: 34/255, alpha: 1) // #8c4a22
        let label = UILabel(frame: cover.bounds)
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.text = "Invoice Lab"
        label.textColor = UIColor(red: 243/255, green: 239/255, blue: 230/255, alpha: 1) // #f3efe6
        label.font = .systemFont(ofSize: 28, weight: .semibold)
        label.textAlignment = .center
        cover.addSubview(label)
        window.addSubview(cover)
        privacyCover = cover
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Give the web app's appStateChange listener a moment to raise the lock screen first.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.privacyCover?.removeFromSuperview()
            self?.privacyCover = nil
        }
    }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = InvoiceLabViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
