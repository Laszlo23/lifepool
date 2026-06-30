// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LifeEUR — EUR-pegged stablecoin for LifePool testnet
contract LifeEUR is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterUpdated(address indexed account, bool allowed);

    constructor(address initialOwner) ERC20("Life Euro", "LIFEUR") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "LifeEUR: not minter");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
}
