// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LifeEUR} from "./LifeEUR.sol";
import {RewardDistributor} from "./RewardDistributor.sol";

/// @title LifePoolVault — cycle-locked LifeEUR membership
contract LifePoolVault is Ownable {
    using SafeERC20 for IERC20;

  /// @dev 4 years + 4 months + 4 days (approx calendar match to JS addCycleLock)
    uint256 public constant CYCLE_DURATION = 4 * 365 days + 4 * 30 days + 4 days;

    LifeEUR public immutable lifeEur;
    RewardDistributor public rewardDistributor;

    struct Membership {
        uint8 tierId;
        uint256 deposited;
        uint256 cycleStart;
        uint256 cycleEnd;
        bool active;
    }

    mapping(address => Membership) public memberships;

    event Joined(address indexed user, uint8 tierId, uint256 amount, uint256 cycleEnd);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardDistributorUpdated(address indexed distributor);

    constructor(address lifeEur_, address initialOwner) Ownable(initialOwner) {
        lifeEur = LifeEUR(lifeEur_);
    }

    function setRewardDistributor(address distributor) external onlyOwner {
        rewardDistributor = RewardDistributor(distributor);
        emit RewardDistributorUpdated(distributor);
    }

    function join(uint8 tierId, uint256 amount) external {
        require(amount > 0, "LifePoolVault: zero amount");
        require(!memberships[msg.sender].active, "LifePoolVault: already member");

        lifeEur.transferFrom(msg.sender, address(this), amount);

        uint256 cycleStart = block.timestamp;
        uint256 cycleEnd = cycleStart + CYCLE_DURATION;

        memberships[msg.sender] = Membership({
            tierId: tierId,
            deposited: amount,
            cycleStart: cycleStart,
            cycleEnd: cycleEnd,
            active: true
        });

        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.stake(msg.sender, amount);
        }

        emit Joined(msg.sender, tierId, amount, cycleEnd);
    }

    function withdraw() external {
        Membership storage m = memberships[msg.sender];
        require(m.active, "LifePoolVault: not member");
        require(block.timestamp >= m.cycleEnd, "LifePoolVault: cycle locked");

        uint256 amount = m.deposited;
        m.active = false;
        m.deposited = 0;

        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.unstake(msg.sender);
        }

        lifeEur.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function membershipOf(address user)
        external
        view
        returns (uint8 tierId, uint256 deposited, uint256 cycleStart, uint256 cycleEnd, bool active)
    {
        Membership memory m = memberships[user];
        return (m.tierId, m.deposited, m.cycleStart, m.cycleEnd, m.active);
    }

    function cycleProgressBps(address user) external view returns (uint256) {
        Membership memory m = memberships[user];
        if (!m.active) return 0;
        if (block.timestamp >= m.cycleEnd) return 10_000;
        if (block.timestamp <= m.cycleStart) return 0;
        return ((block.timestamp - m.cycleStart) * 10_000) / (m.cycleEnd - m.cycleStart);
    }
}
