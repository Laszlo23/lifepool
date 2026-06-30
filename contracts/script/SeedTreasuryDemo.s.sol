// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {LifeEUR} from "../src/LifeEUR.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {LifePoolFaucet} from "../src/LifePoolFaucet.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";

/// @notice One-shot demo seed: 444444 LIFEUR + EUR-pegged tWBTC/tXRP + tUSDC premium deposit.
contract SeedTreasuryDemo is Script {
    uint256 constant LIFE_EUR_AMOUNT = 444_444 ether;
    uint256 constant USDC_PREMIUM = 444_444e6;
    uint256 constant HALF_EUR_8 = 222_222e8; // EUR with 8 decimals

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address treasury = vm.envOr("TREASURY_VAULT_ADDRESS", address(0xF2a9Bea846D5a6b7b974146441CB06b3D3ba9dc2));
        LifeEUR lifeEur = LifeEUR(0x42355c509743a92EBD6F2F7259D4f677Eca18b4d);
        MockERC20 tUsdc = MockERC20(0xAAE3Eb068026cab39A841c2628F983C559AD6C10);
        MockERC20 tWbtc = MockERC20(0x77fBFbFA3d98f6Cc48249C1050127f15aC7D0DAa);
        MockERC20 tXrp = MockERC20(0x2dB46F644703536B2280c9F0B03989c19a69497B);
        MockOracle oracle = MockOracle(0xd323e5b266FA7A13C9c572ad5c7b7f996846EFc0);
        LifePoolFaucet faucet = LifePoolFaucet(0xDbb8dDcf2c9b03A1d64B2284C0Aa0971FBB7ce2E);
        TreasuryVault treasuryVault = TreasuryVault(treasury);

        uint256 btcPrice = oracle.getPriceEur(address(tWbtc));
        uint256 xrpPrice = oracle.getPriceEur(address(tXrp));

        // EUR-pegged: 222222€ in BTC + 222222€ in XRP (oracle 8-dec EUR prices)
        uint256 wbtcAmount = (HALF_EUR_8 * 1e8) / btcPrice;
        uint256 xrpAmount = (HALF_EUR_8 * 1e6) / xrpPrice;

        vm.startBroadcast(deployerPrivateKey);

        // 1. Mint 444444 LIFEUR to treasury
        lifeEur.setMinter(deployer, true);
        lifeEur.mint(treasury, LIFE_EUR_AMOUNT);
        lifeEur.setMinter(deployer, false);

        // 2. Faucet owner mints collateral to deployer, then seed treasury
        faucet.setDripAmounts(USDC_PREMIUM, wbtcAmount, xrpAmount, 0);
        faucet.claim();

        tUsdc.approve(treasury, USDC_PREMIUM);
        treasuryVault.depositPremium(USDC_PREMIUM);

        tWbtc.transfer(treasury, wbtcAmount);
        tXrp.transfer(treasury, xrpAmount);

        // Restore normal faucet drips
        faucet.setDripAmounts(500e6, 1e6, 100e6, 50e18);

        vm.stopBroadcast();

        console2.log("Treasury seeded at", treasury);
        console2.log("LIFEUR minted", LIFE_EUR_AMOUNT / 1e18);
        console2.log("tUSDC premium deposited", USDC_PREMIUM / 1e6);
        console2.log("tWBTC transferred", wbtcAmount);
        console2.log("tXRP transferred", xrpAmount);
        console2.log("BTC price EUR (8d)", btcPrice);
        console2.log("XRP price EUR (8d)", xrpPrice);
    }
}
