// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LifeEUR} from "../src/LifeEUR.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";

contract TreasuryTest is Test {
    LifeEUR lifeEur;
    MockERC20 tUsdc;
    MockERC20 tWbtc;
    RewardDistributor rewards;
    TreasuryVault treasury;

    address operator = address(0xB0B);
    address alice = address(0xA11CE);

    function setUp() public {
        lifeEur = new LifeEUR(address(this));
        tUsdc = new MockERC20("tUSDC", "tUSDC", 6, address(this));
        tWbtc = new MockERC20("tWBTC", "tWBTC", 8, address(this));
        rewards = new RewardDistributor(address(lifeEur), address(this));
        treasury = new TreasuryVault(
            address(lifeEur),
            address(tUsdc),
            address(tWbtc),
            address(tWbtc),
            address(rewards),
            address(this)
        );

        rewards.setTreasuryVault(address(treasury));
        treasury.setOperator(operator);
        lifeEur.setMinter(address(this), true);

        tUsdc.mint(alice, 10_000e6);
        tUsdc.mint(address(treasury), 100_000e6);
        tWbtc.mint(address(treasury), 10e8);

        lifeEur.mint(address(rewards), 50_000e18);
        rewards.notifyRewardDeposit(50_000e18);
    }

    function test_deposit_premium() public {
        vm.startPrank(alice);
        tUsdc.approve(address(treasury), 500e6);
        treasury.depositPremium(500e6);
        vm.stopPrank();

        assertEq(tUsdc.balanceOf(address(treasury)), 100_500e6);
        assertEq(treasury.totalPremiumsReceived(), 500e6);
    }

    function test_execute_dca_splits_sleeves() public {
        vm.prank(operator);
        treasury.executeDca(10_000e6, 6800);

        assertEq(treasury.gridSleeveBalance(), 6800e6);
        assertEq(treasury.stakeSleeveBalance(), 3200e6);
        assertGt(treasury.lastDcaAt(), 0);
    }

    function test_harvest_to_rewards() public {
        lifeEur.mint(address(treasury), 1000e18);

        uint256 before = lifeEur.balanceOf(address(rewards));

        vm.prank(operator);
        treasury.harvestToRewards(500e18);

        assertEq(lifeEur.balanceOf(address(rewards)), before + 500e18);
        assertEq(treasury.totalHarvested(), 500e18);
    }

    function test_non_operator_cannot_dca() public {
        vm.prank(alice);
        vm.expectRevert("TreasuryVault: not operator");
        treasury.executeDca(100e6, 6800);
    }
}
