// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LifeEUR} from "./LifeEUR.sol";
import {MockOracle} from "./mocks/MockOracle.sol";
import {RewardDistributor} from "./RewardDistributor.sol";

/// @title CollateralVault — mint LifeEUR against tWBTC / tXRP collateral
contract CollateralVault is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PRICE_DECIMALS = 1e8;
    uint256 public constant MINT_FEE_BPS = 50; // 0.5%

    LifeEUR public immutable lifeEur;
    MockOracle public immutable oracle;
    IERC20 public immutable tWbtc;
    IERC20 public immutable tXrp;
    RewardDistributor public rewardDistributor;

    uint256 public minCollateralRatioBps = 15_000; // 150%

    struct Position {
        uint256 wbtcAmount;
        uint256 xrpAmount;
        uint256 debtLifeEur;
    }

    mapping(address => Position) public positions;
    mapping(address => bool) public hasMinted;

    event CollateralDeposited(address indexed user, address indexed asset, uint256 amount);
    event LifeEurMinted(address indexed user, uint256 amount, uint256 fee);
    event LifeEurRepaid(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed asset, uint256 amount);
    event RewardDistributorUpdated(address indexed distributor);

    constructor(
        address lifeEur_,
        address oracle_,
        address tWbtc_,
        address tXrp_,
        address initialOwner
    ) Ownable(initialOwner) {
        lifeEur = LifeEUR(lifeEur_);
        oracle = MockOracle(oracle_);
        tWbtc = IERC20(tWbtc_);
        tXrp = IERC20(tXrp_);
    }

    function setRewardDistributor(address distributor) external onlyOwner {
        rewardDistributor = RewardDistributor(distributor);
        emit RewardDistributorUpdated(distributor);
    }

    function setMinCollateralRatioBps(uint256 bps) external onlyOwner {
        require(bps >= 12_000, "CollateralVault: ratio too low");
        minCollateralRatioBps = bps;
    }

    function depositCollateral(address asset, uint256 amount) external {
        require(asset == address(tWbtc) || asset == address(tXrp), "CollateralVault: bad asset");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        Position storage pos = positions[msg.sender];
        if (asset == address(tWbtc)) {
            pos.wbtcAmount += amount;
        } else {
            pos.xrpAmount += amount;
        }
        emit CollateralDeposited(msg.sender, asset, amount);
    }

    function mintLifeEur(uint256 amount) external {
        require(amount > 0, "CollateralVault: zero mint");
        Position storage pos = positions[msg.sender];
        uint256 collateralEur = _collateralValueEur(pos);
        uint256 maxDebt = (collateralEur * 10_000) / minCollateralRatioBps;
        require(pos.debtLifeEur + amount <= maxDebt, "CollateralVault: undercollateralized");

        uint256 fee = (amount * MINT_FEE_BPS) / 10_000;
        uint256 toUser = amount - fee;

        pos.debtLifeEur += amount;
        hasMinted[msg.sender] = true;

        lifeEur.mint(msg.sender, toUser);
        if (fee > 0 && address(rewardDistributor) != address(0)) {
            lifeEur.mint(address(rewardDistributor), fee);
            rewardDistributor.notifyRewardDeposit(fee);
        } else if (fee > 0) {
            lifeEur.mint(owner(), fee);
        }

        emit LifeEurMinted(msg.sender, toUser, fee);
    }

    function repayLifeEur(uint256 amount) external {
        require(amount > 0, "CollateralVault: zero repay");
        Position storage pos = positions[msg.sender];
        require(pos.debtLifeEur >= amount, "CollateralVault: excess repay");

        lifeEur.burnFrom(msg.sender, amount);
        pos.debtLifeEur -= amount;
        emit LifeEurRepaid(msg.sender, amount);
    }

    function withdrawCollateral(address asset, uint256 amount) external {
        require(asset == address(tWbtc) || asset == address(tXrp), "CollateralVault: bad asset");
        Position storage pos = positions[msg.sender];
        require(pos.debtLifeEur == 0, "CollateralVault: debt outstanding");

        if (asset == address(tWbtc)) {
            require(pos.wbtcAmount >= amount, "CollateralVault: insufficient wbtc");
            pos.wbtcAmount -= amount;
        } else {
            require(pos.xrpAmount >= amount, "CollateralVault: insufficient xrp");
            pos.xrpAmount -= amount;
        }

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, asset, amount);
    }

    function collateralRatioBps(address user) external view returns (uint256) {
        Position memory pos = positions[user];
        if (pos.debtLifeEur == 0) return type(uint256).max;
        uint256 collateralEur = _collateralValueEur(pos);
        return (collateralEur * 10_000) / pos.debtLifeEur;
    }

    function maxMintable(address user) external view returns (uint256) {
        Position memory pos = positions[user];
        uint256 collateralEur = _collateralValueEur(pos);
        uint256 maxDebt = (collateralEur * 10_000) / minCollateralRatioBps;
        if (maxDebt <= pos.debtLifeEur) return 0;
        return maxDebt - pos.debtLifeEur;
    }

    function _collateralValueEur(Position memory pos) internal view returns (uint256 valueEur18) {
        if (pos.wbtcAmount > 0) {
            uint256 btcPrice = oracle.getPriceEur(address(tWbtc));
            valueEur18 += (pos.wbtcAmount * btcPrice * 1e10) / 1e8;
        }
        if (pos.xrpAmount > 0) {
            uint256 xrpPrice = oracle.getPriceEur(address(tXrp));
            valueEur18 += (pos.xrpAmount * xrpPrice * 1e12) / 1e6;
        }
    }
}
