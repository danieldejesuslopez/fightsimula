// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FightBetting
 * @notice On-chain betting pool for AI fight simulations.
 *         Each fight is a market with two sides (A/B).
 *         The house (owner) resolves fights after provably-fair simulation.
 *         Payouts are proportional: winners split the losing pool minus house fee.
 */
contract FightBetting {
    address public owner;
    uint256 public constant HOUSE_FEE_BPS = 250; // 2.5%
    uint256 public constant MIN_BET = 0.001 ether;

    enum FightStatus { Open, Locked, Settled, Cancelled }
    enum Side { A, B }

    struct Fight {
        bytes32 seedHash;       // SHA256(serverSeed) published before bets open
        FightStatus status;
        uint256 poolA;
        uint256 poolB;
        Side winner;
        uint256 settledAt;
    }

    struct Bet {
        address bettor;
        Side side;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Fight) public fights;        // fightId => Fight
    mapping(bytes32 => Bet[]) public bets;           // fightId => Bet[]
    mapping(bytes32 => mapping(address => uint256[])) public userBetIndices; // fightId => user => bet indices

    uint256 public houseBalance;

    event FightCreated(bytes32 indexed fightId, bytes32 seedHash);
    event BetPlaced(bytes32 indexed fightId, address indexed bettor, Side side, uint256 amount);
    event FightSettled(bytes32 indexed fightId, Side winner, string serverSeed);
    event FightCancelled(bytes32 indexed fightId);
    event Claimed(bytes32 indexed fightId, address indexed bettor, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Create a new fight market
    function createFight(bytes32 fightId, bytes32 seedHash) external onlyOwner {
        require(fights[fightId].seedHash == bytes32(0), "Fight exists");
        fights[fightId] = Fight({
            seedHash: seedHash,
            status: FightStatus.Open,
            poolA: 0,
            poolB: 0,
            winner: Side.A, // default, only matters after settlement
            settledAt: 0
        });
        emit FightCreated(fightId, seedHash);
    }

    /// @notice Place a bet on a fight
    function placeBet(bytes32 fightId, Side side) external payable {
        Fight storage fight = fights[fightId];
        require(fight.seedHash != bytes32(0), "Fight not found");
        require(fight.status == FightStatus.Open, "Betting closed");
        require(msg.value >= MIN_BET, "Below min bet");

        uint256 idx = bets[fightId].length;
        bets[fightId].push(Bet({
            bettor: msg.sender,
            side: side,
            amount: msg.value,
            claimed: false
        }));
        userBetIndices[fightId][msg.sender].push(idx);

        if (side == Side.A) fight.poolA += msg.value;
        else fight.poolB += msg.value;

        emit BetPlaced(fightId, msg.sender, side, msg.value);
    }

    /// @notice Lock betting (no more bets, fight about to start)
    function lockFight(bytes32 fightId) external onlyOwner {
        Fight storage fight = fights[fightId];
        require(fight.status == FightStatus.Open, "Not open");
        fight.status = FightStatus.Locked;
    }

    /// @notice Settle the fight — reveal serverSeed and declare winner
    function settleFight(bytes32 fightId, Side winner, string calldata serverSeed) external onlyOwner {
        Fight storage fight = fights[fightId];
        require(fight.status == FightStatus.Open || fight.status == FightStatus.Locked, "Cannot settle");

        // Verify provably fair: keccak256(serverSeed) must match seedHash
        require(keccak256(abi.encodePacked(serverSeed)) == fight.seedHash, "Seed mismatch");

        fight.status = FightStatus.Settled;
        fight.winner = winner;
        fight.settledAt = block.timestamp;

        // Calculate house fee
        uint256 totalPool = fight.poolA + fight.poolB;
        uint256 fee = (totalPool * HOUSE_FEE_BPS) / 10000;
        houseBalance += fee;

        emit FightSettled(fightId, winner, serverSeed);
    }

    /// @notice Cancel a fight — all bettors can reclaim
    function cancelFight(bytes32 fightId) external onlyOwner {
        Fight storage fight = fights[fightId];
        require(fight.status == FightStatus.Open || fight.status == FightStatus.Locked, "Cannot cancel");
        fight.status = FightStatus.Cancelled;
        emit FightCancelled(fightId);
    }

    /// @notice Claim winnings (or refund if cancelled)
    function claim(bytes32 fightId) external {
        Fight storage fight = fights[fightId];
        uint256[] storage indices = userBetIndices[fightId][msg.sender];
        require(indices.length > 0, "No bets");

        uint256 totalPayout = 0;

        for (uint256 i = 0; i < indices.length; i++) {
            Bet storage bet = bets[fightId][indices[i]];
            if (bet.claimed) continue;
            bet.claimed = true;

            if (fight.status == FightStatus.Cancelled) {
                // Refund
                totalPayout += bet.amount;
            } else if (fight.status == FightStatus.Settled && bet.side == fight.winner) {
                // Payout: proportional share of total pool minus fee
                uint256 totalPool = fight.poolA + fight.poolB;
                uint256 fee = (totalPool * HOUSE_FEE_BPS) / 10000;
                uint256 payoutPool = totalPool - fee;
                uint256 winningPool = fight.winner == Side.A ? fight.poolA : fight.poolB;

                totalPayout += (bet.amount * payoutPool) / winningPool;
            }
        }

        require(totalPayout > 0, "Nothing to claim");
        (bool ok, ) = msg.sender.call{value: totalPayout}("");
        require(ok, "Transfer failed");
        emit Claimed(fightId, msg.sender, totalPayout);
    }

    /// @notice Withdraw house fees
    function withdrawFees() external onlyOwner {
        uint256 amount = houseBalance;
        houseBalance = 0;
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Get bet count for a fight
    function getBetCount(bytes32 fightId) external view returns (uint256) {
        return bets[fightId].length;
    }

    /// @notice Get user's bets for a fight
    function getUserBets(bytes32 fightId, address user) external view returns (uint256[] memory) {
        return userBetIndices[fightId][user];
    }

    receive() external payable {}
}
