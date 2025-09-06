import { WEB3AUTH_NETWORK } from "@web3auth/modal"
import { type Web3AuthContextConfig } from "@web3auth/modal/react"

const clientId = "BH58wUd2IJNjnDhfNDTTcvdB7MFXh9PtbiVsaM7YFqAIl92UJtcScxnlkBVK1RClgKYlynViZwo-x6qMRJ-KIZk"

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    sessionTime: 86400 * 7, // 7 days in seconds
    storageType: "local", // Persist across browser tabs and restarts
    uiConfig: {
      logoLight: "https://web3auth.io/images/w3a-L-Favicon-1.svg",
      logoDark: "https://web3auth.io/images/w3a-L-Favicon-1.svg",
      loginMethodsOrder: ["google", "facebook", "twitter", "discord", "github", "email_passwordless"],
    }
  }
}

export default web3AuthContextConfig


