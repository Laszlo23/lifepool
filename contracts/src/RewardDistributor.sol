// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LifeEUR} from "./LifeEUR.sol";
import {ICollateralVault} from "./interfaces/ICollateralVault.sol";

/// @title RewardDistributor — grid-agent reward accrual for pool members
contract RewardDistributor is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MINTER_BONUS_BPS = 12_500; // 1.25x for minters who joined pool
    uint256 public constant PRECISION = 1e18;

    LifeEUR public immutable lifeEur;
    ICollateralVault public collateralVault;
    address public poolVault;

    uint256 public rewardPerShareStored;
    uint256 public totalStaked;
    uint256 public rewardPoolBalance;
    uint256 public rewardRateBps = 500; // 5% APY proxy, keeper-updated

    address public keeper;
    address public treasuryVault;

    struct StakerInfo {
        uint256 staked;
        uint256 rewardDebt;
        bool minterBonus;
    }

    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardDeposited(uint256 amount);
    event RewardRateUpdated(uint256 rateBps);
    event KeeperUpdated(address indexed keeper);
    event CollateralVaultUpdated(address indexed vault);

    constructor(address lifeEur_, address initialOwner) Ownable(initialOwner) {
        lifeEur = LifeEUR(lifeEur_);
        keeper = initialOwner;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner(), "RewardDistributor: not keeper");
        _;
    }

    function setKeeper(address newKeeper) external onlyOwner {
        keeper = newKeeper;
        emit KeeperUpdated(newKeeper);
    }

    function setCollateralVault(address vault) external onlyOwner {
        collateralVault = ICollateralVault(vault);
        emit CollateralVaultUpdated(vault);
    }

    function setPoolVault(address vault) external onlyOwner {
        poolVault = vault;
    }

    function setTreasuryVault(address vault) external onlyOwner {
        treasuryVault = vault;
    }

    function notifyRewardDeposit(uint256 amount) external {
        require(
            msg.sender == owner()
                || msg.sender == address(collateralVault)
                || msg.sender == treasuryVault,
            "RewardDistributor: unauthorized"
        );
        rewardPoolBalance += amount;
        if (totalStaked > 0) {
            rewardPerShareStored += (amount * PRECISION) / totalStaked;
        }
        emit RewardDeposited(amount);
    }

    function setRewardRateBps(uint256 rateBps) external onlyKeeper {
        require(rateBps <= 5000, "RewardDistributor: rate too high");
        rewardRateBps = rateBps;
        emit RewardRateUpdated(rateBps);
    }

    function stake(address user, uint256 amount) external {
        require(msg.sender == poolVault || msg.sender == owner(), "RewardDistributor: only pool");
        _updateRewards(user);
        StakerInfo storage info = stakers[user];
        if (address(collateralVault) != address(0)) {
            info.minterBonus = collateralVault.hasMinted(user);
        }
        info.staked += amount;
        info.rewardDebt = (info.staked * rewardPerShareStored) / PRECISION;
        totalStaked += amount;
        emit Staked(user, amount);
    }

    function unstake(address user) external {
        require(msg.sender == poolVault || msg.sender == owner(), "RewardDistributor: only pool");
        _claim(user);
        StakerInfo storage info = stakers[user];
        totalStaked -= info.staked;
        info.staked = 0;
        info.rewardDebt = 0;
        info.minterBonus = false;
        emit Unstaked(user);
    }

    function claim() external {
        _claim(msg.sender);
    }

    function pendingReward(address user) public view returns (uint256) {
        StakerInfo memory info = stakers[user];
        if (info.staked == 0) return 0;
        uint256 accumulated = (info.staked * rewardPerShareStored) / PRECISION;
        if (accumulated <= info.rewardDebt) return 0;
        uint256 reward = accumulated - info.rewardDebt;
        if (info.minterBonus) {
            reward = (reward * MINTER_BONUS_BPS) / 10_000;
        }
        return reward;
    }

    function _claim(address user) internal {
        _updateRewards(user);
        uint256 reward = pendingReward(user);
        if (reward == 0) return;
        require(reward <= rewardPoolBalance, "RewardDistributor: insufficient pool");

        StakerInfo storage info = stakers[user];
        info.rewardDebt = (info.staked * rewardPerShareStored) / PRECISION;
        rewardPoolBalance -= reward;
        lifeEur.transfer(user, reward);
        emit RewardClaimed(user, reward);
    }

    function _updateRewards(address user) internal {
        StakerInfo storage info = stakers[user];
        if (info.staked == 0 || rewardPoolBalance == 0) return;
        // Accrue based on reward rate proxy (small drip from pool)
        uint256 drip = (info.staked * rewardRateBps) / (10_000 * 365);
        if (drip > rewardPoolBalance) drip = rewardPoolBalance;
        if (drip > 0 && totalStaked > 0) {
            rewardPerShareStored += (drip * PRECISION) / totalStaked;
            rewardPoolBalance -= drip;
        }
    }
}
