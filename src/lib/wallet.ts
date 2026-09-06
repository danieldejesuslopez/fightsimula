"use client";

import { BrowserProvider, formatEther } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
}

export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Install MetaMask to continue.");
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];

  if (accounts.length === 0) throw new Error("No accounts found");

  const address = accounts[0];
  const balance = formatEther(await provider.getBalance(address));
  const network = await provider.getNetwork();

  return {
    connected: true,
    address,
    balance: parseFloat(balance).toFixed(4),
    chainId: Number(network.chainId),
  };
}

export async function getWalletState(): Promise<WalletState | null> {
  if (!window.ethereum) return null;

  try {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = (await provider.send("eth_accounts", [])) as string[];
    if (accounts.length === 0) return null;

    const address = accounts[0];
    const balance = formatEther(await provider.getBalance(address));
    const network = await provider.getNetwork();

    return {
      connected: true,
      address,
      balance: parseFloat(balance).toFixed(4),
      chainId: Number(network.chainId),
    };
  } catch {
    return null;
  }
}

export function onAccountsChanged(handler: (accounts: string[]) => void) {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", handler as (...args: unknown[]) => void);
  return () => window.ethereum?.removeListener("accountsChanged", handler as (...args: unknown[]) => void);
}
