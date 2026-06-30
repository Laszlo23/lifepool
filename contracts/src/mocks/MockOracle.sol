// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockOracle — keeper-updated EUR prices (8 decimals)
contract MockOracle is Ownable {
    mapping(address => uint256) public pricesEur;
    address public keeper;

    event PriceUpdated(address indexed asset, uint256 priceEur);
    event KeeperUpdated(address indexed keeper);

    constructor(address initialOwner) Ownable(initialOwner) {
        keeper = initialOwner;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner(), "MockOracle: not keeper");
        _;
    }

    function setKeeper(address newKeeper) external onlyOwner {
        keeper = newKeeper;
        emit KeeperUpdated(newKeeper);
    }

    function setPrice(address asset, uint256 priceEur) external onlyKeeper {
        require(priceEur > 0, "MockOracle: zero price");
        pricesEur[asset] = priceEur;
        emit PriceUpdated(asset, priceEur);
    }

    function getPriceEur(address asset) external view returns (uint256) {
        uint256 price = pricesEur[asset];
        require(price > 0, "MockOracle: price unset");
        return price;
    }
}
