"use client";

import { BrowserProvider, Contract, parseEther, formatEther, keccak256, toUtf8Bytes } from "ethers";

// ABI for the FightBetting contract (only the functions we need)
const FIGHT_BETTING_ABI = [
  "function placeBet(bytes32 fightId, uint8 side) external payable",
  "function claim(bytes32 fightId) external",
  "function fights(bytes32) external view returns (bytes32 seedHash, uint8 status, uint256 poolA, uint256 poolB, uint8 winner, uint256 settledAt)",
  "function getBetCount(bytes32 fightId) external view returns (uint256)",
  "function getUserBets(bytes32 fightId, address user) external view returns (uint256[])",
  "event BetPlaced(bytes32 indexed fightId, address indexed bettor, uint8 side, uint256 amount)",
  "event Claimed(bytes32 indexed fightId, address indexed bettor, uint256 payout)",
];

// Contract address — set after deployment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// Convert fight UUID to bytes32 for the contract
export function fightIdToBytes32(fightId: string): string {
  return keccak256(toUtf8Bytes(fightId));
}

export function getContract(signer: unknown) {
  if (!CONTRACT_ADDRESS) throw new Error("Contract not deployed yet. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
  return new Contract(CONTRACT_ADDRESS, FIGHT_BETTING_ABI, signer as never);
}

export async function placeBetOnChain(fightId: string, side: "A" | "B", amountEth: string) {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = getContract(signer);

  const fightBytes32 = fightIdToBytes32(fightId);
  const sideEnum = side === "A" ? 0 : 1;
  const value = parseEther(amountEth);

  const tx = await contract.placeBet(fightBytes32, sideEnum, { value });
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

export async function claimOnChain(fightId: string) {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = getContract(signer);

  const fightBytes32 = fightIdToBytes32(fightId);
  const tx = await contract.claim(fightBytes32);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

export async function getFightPoolOnChain(fightId: string) {
  if (!window.ethereum || !CONTRACT_ADDRESS) return null;

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, FIGHT_BETTING_ABI, provider);

  const fightBytes32 = fightIdToBytes32(fightId);
  const fight = await contract.fights(fightBytes32);

  return {
    poolA: formatEther(fight.poolA),
    poolB: formatEther(fight.poolB),
    status: Number(fight.status),
  };
}

export function isContractDeployed(): boolean {
  return !!CONTRACT_ADDRESS;
}
