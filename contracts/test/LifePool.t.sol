// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LifeEUR} from "../src/LifeEUR.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {LifePoolVault} from "../src/LifePoolVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";
import {LifePoolFaucet} from "../src/LifePoolFaucet.sol";

contract LifePoolTest is Test {
    LifeEUR lifeEur;
    MockERC20 tUsdc;
    MockERC20 tWbtc;
    MockERC20 tXrp;
    MockOracle oracle;
    CollateralVault vault;
    LifePoolVault pool;
    RewardDistributor rewards;
    LifePoolFaucet faucet;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        lifeEur = new LifeEUR(address(this));
        oracle = new MockOracle(address(this));
        tUsdc = new MockERC20("tUSDC", "tUSDC", 6, address(this));
        tWbtc = new MockERC20("Test WBTC", "tWBTC", 8, address(this));
        tXrp = new MockERC20("Test XRP", "tXRP", 6, address(this));

        rewards = new RewardDistributor(address(lifeEur), address(this));
        vault = new CollateralVault(address(lifeEur), address(oracle), address(tWbtc), address(tXrp), address(this));
        pool = new LifePoolVault(address(lifeEur), address(this));
        faucet = new LifePoolFaucet(address(lifeEur), address(tUsdc), address(tWbtc), address(tXrp), address(this));

        lifeEur.setMinter(address(vault), true);
        lifeEur.setMinter(address(faucet), true);
        lifeEur.setMinter(address(this), true);

        vault.setRewardDistributor(address(rewards));
        pool.setRewardDistributor(address(rewards));
        rewards.setCollateralVault(address(vault));
        rewards.setPoolVault(address(pool));

        tWbtc.mint(alice, 10e8);
        tWbtc.mint(bob, 10e8);

        tWbtc.transferOwnership(address(faucet));
        tXrp.transferOwnership(address(faucet));
        tUsdc.transferOwnership(address(faucet));

        // BTC ~85k EUR, XRP ~2 EUR (8 decimal prices)
        oracle.setPrice(address(tWbtc), 85_000e8);
        oracle.setPrice(address(tXrp), 2e8);

        lifeEur.mint(address(rewards), 10_000e18);
        rewards.notifyRewardDeposit(10_000e18);
    }

    function test_faucet_rate_limit() public {
        vm.prank(alice);
        faucet.claim();

        vm.prank(alice);
        vm.expectRevert("LifePoolFaucet: cooldown");
        faucet.claim();

        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(alice);
        faucet.claim();
    }

    function test_mint_life_eur_at_collateral_ratio() public {
        vm.startPrank(alice);
        tWbtc.approve(address(vault), 1e8);
        vault.depositCollateral(address(tWbtc), 1e8);

        uint256 maxMint = vault.maxMintable(alice);
        assertGt(maxMint, 0);
        vault.mintLifeEur(maxMint);
        assertGt(lifeEur.balanceOf(alice), 0);
        assertTrue(vault.hasMinted(alice));
        vm.stopPrank();
    }

    function test_cannot_withdraw_before_cycle_end() public {
        vm.prank(alice);
        faucet.claim();

        vm.startPrank(alice);
        lifeEur.approve(address(pool), 10e18);
        pool.join(1, 10e18);
        vm.expectRevert("LifePoolVault: cycle locked");
        pool.withdraw();
        vm.stopPrank();

        uint256 duration = pool.CYCLE_DURATION();
        vm.warp(block.timestamp + duration + 1);
        vm.prank(alice);
        pool.withdraw();
    }

    function test_repay_unlocks_collateral() public {
        vm.startPrank(bob);
        tWbtc.approve(address(vault), 1e8);
        vault.depositCollateral(address(tWbtc), 1e8);
        uint256 mintAmount = vault.maxMintable(bob) / 2;
        vault.mintLifeEur(mintAmount);
        vm.stopPrank();
        lifeEur.mint(bob, mintAmount - lifeEur.balanceOf(bob));
        vm.startPrank(bob);
        lifeEur.approve(address(vault), mintAmount);
        vault.repayLifeEur(mintAmount);
        vault.withdrawCollateral(address(tWbtc), 1e8);
        assertEq(tWbtc.balanceOf(bob), 10e8);
        vm.stopPrank();
    }
}
