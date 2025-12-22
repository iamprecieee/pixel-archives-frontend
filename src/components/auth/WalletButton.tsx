import type { FC } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const WalletButton: FC = () => {
  const { publicKey } = useWallet();

  return (
    <div className="retro-wallet-button-wrapper">
      <WalletMultiButton>
        {publicKey ? undefined : "CONNECT WALLET"}
      </WalletMultiButton>
    </div>
  );
};
