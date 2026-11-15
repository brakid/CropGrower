// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IGold3 { function transfer(address to, uint256 amount) external returns (bool); }

contract DailyContracts is AccessControl {
    IGold3 public gold;
    address public treasury;
    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) { treasury = t; }
    mapping(address => uint256) public lastCompletedDay;

    constructor(address gold_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        gold = IGold3(gold_);
    }

    function currentDay() public view returns (uint256) {
        return block.timestamp / 86400;
    }

    function completeQuest(uint8 slotIndex) external {
        uint256 day = currentDay();
        require(lastCompletedDay[msg.sender] < day, "already completed today");
        // simplified payout
        gold.transfer(msg.sender, 10e18);
        lastCompletedDay[msg.sender] = day;
    }
}
