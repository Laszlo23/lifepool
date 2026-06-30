// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LifeEUR} from "./LifeEUR.sol";
import {RewardDistributor} from "./RewardDistributor.sol";

/// @title TreasuryVault — pool treasury for grid/stake sleeves (B3OS operator)
contract TreasuryVault is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_GRID_BPS = 8000;
    uint256 public constant MIN_GRID_BPS = 5000;

    LifeEUR public immutable lifeEur;
    IERC20 public immutable premiumAsset;
    IERC20 public immutable gridAsset;
    IERC20 public immutable stakeAsset;
    RewardDistributor public rewardDistributor;

    address public operator;
    uint256 public gridAllocationBps = 6800;
    uint256 public totalPremiumsReceived;
    uint256 public gridSleeveBalance;
    uint256 public stakeSleeveBalance;
    uint256 public totalHarvested;
    uint256 public lastDcaAt;

    event OperatorUpdated(address indexed operator);
    event RewardDistributorUpdated(address indexed distributor);
    event PremiumDeposited(address indexed from, uint256 amount);
    event DcaExecuted(uint256 gridAmount, uint256 stakeAmount, uint256 gridBps);
    event Harvested(uint256 amount, address indexed operator);
    event GridAllocationUpdated(uint256 gridBps);

    constructor(
        address lifeEur_,
        address premiumAsset_,
        address gridAsset_,
        address stakeAsset_,
        address rewardDistributor_,
        address initialOwner
    ) Ownable(initialOwner) {
        lifeEur = LifeEUR(lifeEur_);
        premiumAsset = IERC20(premiumAsset_);
        gridAsset = IERC20(gridAsset_);
        stakeAsset = IERC20(stakeAsset_);
        rewardDistributor = RewardDistributor(rewardDistributor_);
        operator = initialOwner;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "TreasuryVault: not operator");
        _;
    }

    function setOperator(address newOperator) external onlyOwner {
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    function setRewardDistributor(address distributor) external onlyOwner {
        rewardDistributor = RewardDistributor(distributor);
        emit RewardDistributorUpdated(distributor);
    }

    function setGridAllocationBps(uint256 gridBps) external onlyOperator {
        require(gridBps >= MIN_GRID_BPS && gridBps <= MAX_GRID_BPS, "TreasuryVault: invalid grid bps");
        gridAllocationBps = gridBps;
        emit GridAllocationUpdated(gridBps);
    }

    /// @notice Accept monthly premiums (USDC/LIFEUR) into treasury
    function depositPremium(uint256 amount) external {
        require(amount > 0, "TreasuryVault: zero amount");
        premiumAsset.safeTransferFrom(msg.sender, address(this), amount);
        totalPremiumsReceived += amount;
        emit PremiumDeposited(msg.sender, amount);
    }

    /// @notice Operator splits premium float into grid/stake sleeve accounting
    function executeDca(uint256 amount, uint256 gridBps) external onlyOperator {
        require(amount > 0, "TreasuryVault: zero amount");
        require(gridBps >= MIN_GRID_BPS && gridBps <= MAX_GRID_BPS, "TreasuryVault: invalid grid bps");

        uint256 bal = premiumAsset.balanceOf(address(this));
        require(amount <= bal, "TreasuryVault: insufficient premium balance");

        uint256 gridAmount = (amount * gridBps) / 10_000;
        uint256 stakeAmount = amount - gridAmount;

        gridSleeveBalance += gridAmount;
        stakeSleeveBalance += stakeAmount;
        lastDcaAt = block.timestamp;

        emit DcaExecuted(gridAmount, stakeAmount, gridBps);
    }

    /// @notice Pipe LIFEUR harvest profits to member reward pool
    function harvestToRewards(uint256 amount) external onlyOperator {
        require(amount > 0, "TreasuryVault: zero harvest");
        require(lifeEur.balanceOf(address(this)) >= amount, "TreasuryVault: insufficient LIFEUR");

        lifeEur.transfer(address(rewardDistributor), amount);
        rewardDistributor.notifyRewardDeposit(amount);

        totalHarvested += amount;
        emit Harvested(amount, msg.sender);
    }

    function treasuryNav() external view returns (uint256 premiumBal, uint256 gridBal, uint256 stakeBal) {
        return (
            premiumAsset.balanceOf(address(this)),
            gridAsset.balanceOf(address(this)),
            stakeAsset.balanceOf(address(this))
        );
    }
}
