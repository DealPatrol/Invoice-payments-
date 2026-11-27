import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var privacyCover: UIView?

    // Installed before iOS takes its app-switcher snapshot so invoice amounts and client names
    // never show in the multitasking view.
    func sceneWillResignActive(_ scene: UIScene) {
        guard privacyCover == nil, let window = window else { return }
        let cover = UIView(frame: window.bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor(red: 31/255, green: 111/255, blue: 92/255, alpha: 1) // #1f6f5c
        let label = UILabel(frame: cover.bounds)
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.text = "Invoice Jot"
        label.textColor = UIColor(red: 246/255, green: 244/255, blue: 239/255, alpha: 1) // #f6f4ef
        label.font = .systemFont(ofSize: 28, weight: .semibold)
        label.textAlignment = .center
        cover.addSubview(label)
        window.addSubview(cover)
        privacyCover = cover
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.privacyCover?.removeFromSuperview()
            self?.privacyCover = nil
        }
    }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = BridgeViewController()
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
