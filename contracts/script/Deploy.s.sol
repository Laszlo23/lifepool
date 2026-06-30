// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {LifeEUR} from "../src/LifeEUR.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {LifePoolVault} from "../src/LifePoolVault.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";
import {LifePoolFaucet} from "../src/LifePoolFaucet.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        LifeEUR lifeEur = new LifeEUR(deployer);
        MockOracle oracle = new MockOracle(deployer);
        MockERC20 tUsdc = new MockERC20("Test USDC", "tUSDC", 6, deployer);
        MockERC20 tWbtc = new MockERC20("Test Wrapped BTC", "tWBTC", 8, deployer);
        MockERC20 tXrp = new MockERC20("Test XRP", "tXRP", 6, deployer);
        RewardDistributor rewards = new RewardDistributor(address(lifeEur), deployer);
        CollateralVault vault = new CollateralVault(
            address(lifeEur), address(oracle), address(tWbtc), address(tXrp), deployer
        );
        LifePoolVault pool = new LifePoolVault(address(lifeEur), deployer);
        TreasuryVault treasury = new TreasuryVault(
            address(lifeEur),
            address(tUsdc),
            address(tWbtc),
            address(tWbtc),
            address(rewards),
            deployer
        );
        LifePoolFaucet faucet = new LifePoolFaucet(
            address(lifeEur), address(tUsdc), address(tWbtc), address(tXrp), deployer
        );

        lifeEur.setMinter(address(vault), true);
        lifeEur.setMinter(address(faucet), true);

        vault.setRewardDistributor(address(rewards));
        pool.setRewardDistributor(address(rewards));
        rewards.setCollateralVault(address(vault));
        rewards.setPoolVault(address(pool));
        rewards.setTreasuryVault(address(treasury));
        oracle.setKeeper(deployer);
        rewards.setKeeper(deployer);
        treasury.setOperator(deployer);

        oracle.setPrice(address(tWbtc), 85_000e8);
        oracle.setPrice(address(tXrp), 2e8);

        tUsdc.mint(address(treasury), 1_000_000e6);
        tWbtc.mint(address(treasury), 100e8);

        tUsdc.transferOwnership(address(faucet));
        tWbtc.transferOwnership(address(faucet));
        tXrp.transferOwnership(address(faucet));

        lifeEur.setMinter(deployer, true);
        lifeEur.mint(address(rewards), 100_000e18);
        lifeEur.mint(address(treasury), 50_000e18);
        lifeEur.setMinter(deployer, false);
        rewards.notifyRewardDeposit(100_000e18);

        vm.stopBroadcast();

        console2.log("LifeEUR", address(lifeEur));
        console2.log("MockOracle", address(oracle));
        console2.log("tUSDC", address(tUsdc));
        console2.log("tWBTC", address(tWbtc));
        console2.log("tXRP", address(tXrp));
        console2.log("CollateralVault", address(vault));
        console2.log("LifePoolVault", address(pool));
        console2.log("TreasuryVault", address(treasury));
        console2.log("RewardDistributor", address(rewards));
        console2.log("LifePoolFaucet", address(faucet));
    }
}
