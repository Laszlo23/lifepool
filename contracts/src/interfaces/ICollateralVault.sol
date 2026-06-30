// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICollateralVault {
    function hasMinted(address user) external view returns (bool);
}
