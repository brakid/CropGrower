// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IGold4 { function transfer(address to, uint256 amount) external returns (bool); function transferFrom(address from, address to, uint256 amount) external returns (bool); function balanceOf(address account) external view returns (uint256); }

contract TreasuryRewardPool is AccessControl {
    bytes32 public constant PAYOUT_ROLE = keccak256("PAYOUT_ROLE");

    IGold4 public gold;

    constructor(address gold_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        gold = IGold4(gold_);
    }

    function deposit(uint256 amount) external {
        gold.transferFrom(msg.sender, address(this), amount);
    }

    function payout(address to, uint256 amount) external onlyRole(PAYOUT_ROLE) {
        gold.transfer(to, amount);
    }

    function balance() external view returns (uint256) {
        return gold.balanceOf(address(this));
    }
}
