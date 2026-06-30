// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LifeEUR} from "./LifeEUR.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @title LifePoolFaucet — rate-limited testnet drip
contract LifePoolFaucet is Ownable {
    uint256 public constant CLAIM_COOLDOWN = 24 hours;

    LifeEUR public immutable lifeEur;
    MockERC20 public immutable tUsdc;
    MockERC20 public immutable tWbtc;
    MockERC20 public immutable tXrp;

    uint256 public usdcDrip = 500e6; // 500 tUSDC (6 dec)
    uint256 public wbtcDrip = 1e6; // 0.01 tWBTC (8 dec)
    uint256 public xrpDrip = 100e6; // 100 tXRP (6 dec)
    uint256 public lifeEurDrip = 50e18; // 50 LIFEUR

    mapping(address => uint256) public lastClaimAt;

    event Claimed(address indexed user, uint256 usdc, uint256 wbtc, uint256 xrp, uint256 lifeEur);
    event DripUpdated(uint256 usdc, uint256 wbtc, uint256 xrp, uint256 lifeEur);

    constructor(
        address lifeEur_,
        address tUsdc_,
        address tWbtc_,
        address tXrp_,
        address initialOwner
    ) Ownable(initialOwner) {
        lifeEur = LifeEUR(lifeEur_);
        tUsdc = MockERC20(tUsdc_);
        tWbtc = MockERC20(tWbtc_);
        tXrp = MockERC20(tXrp_);
    }

    function setDripAmounts(uint256 usdc, uint256 wbtc, uint256 xrp, uint256 lifeEurAmount) external onlyOwner {
        usdcDrip = usdc;
        wbtcDrip = wbtc;
        xrpDrip = xrp;
        lifeEurDrip = lifeEurAmount;
        emit DripUpdated(usdc, wbtc, xrp, lifeEurAmount);
    }

    function claim() external {
        if (lastClaimAt[msg.sender] != 0) {
            require(
                block.timestamp >= lastClaimAt[msg.sender] + CLAIM_COOLDOWN,
                "LifePoolFaucet: cooldown"
            );
        }
        lastClaimAt[msg.sender] = block.timestamp;

        tUsdc.mint(msg.sender, usdcDrip);
        tWbtc.mint(msg.sender, wbtcDrip);
        tXrp.mint(msg.sender, xrpDrip);
        lifeEur.mint(msg.sender, lifeEurDrip);

        emit Claimed(msg.sender, usdcDrip, wbtcDrip, xrpDrip, lifeEurDrip);
    }

    function canClaim(address user) external view returns (bool) {
        if (lastClaimAt[user] == 0) return true;
        return block.timestamp >= lastClaimAt[user] + CLAIM_COOLDOWN;
    }

    function nextClaimAt(address user) external view returns (uint256) {
        uint256 next = lastClaimAt[user] + CLAIM_COOLDOWN;
        return next > block.timestamp ? next : block.timestamp;
    }
}
