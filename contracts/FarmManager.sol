// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IGold { function transferFrom(address from, address to, uint256 amount) external returns (bool); function transfer(address to, uint256 amount) external returns (bool); }
interface ISoilTiles { function ownerOf(uint256 tokenId) external view returns (address); function tileInfo(uint256 tokenId) external view returns (uint8 cropType, uint8 rarity, bool isSoulbound, bool hasPermanentBoost); }
interface IFarmItems2 { function burn(address from, uint256 id, uint256 amount) external; function mintReward(address to, uint256 id, uint256 amount) external; }

contract FarmManager is AccessControl {
    uint256 public constant MAX_TILES = 20;

    IGold public gold;
    ISoilTiles public tiles;
    IFarmItems2 public items;

    mapping(address => uint256[]) public stakedTiles;
    mapping(uint256 => uint64) public plantedAt;
    mapping(uint256 => bool) public isFertilized;
    mapping(uint256 => uint8) public tileCropType;
    mapping(uint256 => uint8) public tileRarity;
    mapping(uint256 => bool) public hasPermanentBoost;
    mapping(uint256 => bool) public isStaked;
    mapping(uint256 => address) public stakedBy;

    uint8 public activeWeatherEvent;
    address public treasury;
    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) { treasury = t; }
    uint16 public weatherBonusBps;

    uint256 public constant GROWTH_DURATION = 60 minutes;

    constructor(address gold_, address tiles_, address items_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        gold = IGold(gold_);
        tiles = ISoilTiles(tiles_);
        items = IFarmItems2(items_);
    }

    function stakeTile(uint256 tokenId) external {
        require(tiles.ownerOf(tokenId) == msg.sender, "not owner");
        require(!isStaked[tokenId], "already staked");
        require(stakedTiles[msg.sender].length < MAX_TILES, "max tiles");
        stakedTiles[msg.sender].push(tokenId);
        isStaked[tokenId] = true;
        stakedBy[tokenId] = msg.sender;
        (uint8 ct, uint8 rar, , bool boost) = tiles.tileInfo(tokenId);
        tileCropType[tokenId] = ct;
        tileRarity[tokenId] = rar;
        hasPermanentBoost[tokenId] = boost;
    }

    function unstakeTile(uint256 tokenId) external {
        require(plantedAt[tokenId] == 0, "growing");
        uint256[] storage arr = stakedTiles[msg.sender];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == tokenId) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                isStaked[tokenId] = false;
                stakedBy[tokenId] = address(0);
                return;
            }
        }
        revert("not staked");
    }

    function plantBatch(uint256[] calldata tokenIds, bool[] calldata applyFertilizer) external {
        require(tokenIds.length == applyFertilizer.length, "len");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tid = tokenIds[i];
            require(isStaked[tid] && stakedBy[tid] == msg.sender, "not your staked tile");
            require(plantedAt[tid] == 0, "already planted");
            if (applyFertilizer[i]) {
                items.burn(msg.sender, 21, 1);
                isFertilized[tid] = true;
            }
            plantedAt[tid] = uint64(block.timestamp);
        }
    }

    function harvestBatch(uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tid = tokenIds[i];
            require(isStaked[tid] && stakedBy[tid] == msg.sender, "not your staked tile");
            require(plantedAt[tid] != 0, "not planted");
            require(block.timestamp >= plantedAt[tid] + GROWTH_DURATION, "not ready");
            // set bonus: count staked tiles with same crop type
            uint256 sameCrop = 0;
            uint256[] memory arr = stakedTiles[msg.sender];
            for (uint256 j = 0; j < arr.length; j++) {
                if (tileCropType[arr[j]] == tileCropType[tid]) sameCrop++;
            }
            uint256 setBonus = 0;
            if (sameCrop >= 20) setBonus = 20;
            else if (sameCrop >= 15) setBonus = 15;
            else if (sameCrop >= 10) setBonus = 10;
            else if (sameCrop >= 5) setBonus = 5;

            uint256 yieldAmt = 10;
            if (tileRarity[tid] == 1) yieldAmt += 2;
            if (tileRarity[tid] == 2) yieldAmt += 5;
            if (hasPermanentBoost[tid]) yieldAmt += 2;
            if (isFertilized[tid]) { yieldAmt += 2; isFertilized[tid] = false; }
            yieldAmt += setBonus;
            yieldAmt += (yieldAmt * weatherBonusBps) / 10000;
            items.mintReward(msg.sender, uint256(tileCropType[tid]) + 1, yieldAmt);
            plantedAt[tid] = 0;
        }
    }

    function applyPermanentBoost(uint256 tokenId, bool useKit) external {
        require(isStaked[tokenId] && stakedBy[tokenId] == msg.sender, "not your staked tile");
        if (useKit) {
            items.burn(msg.sender, 22, 1);
        } else {
            // deduct 15 gold (simplified)
            gold.transferFrom(msg.sender, address(this), 15e18);
        }
        hasPermanentBoost[tokenId] = true;
    }

    function useInstantHarvestScroll() external {
        items.burn(msg.sender, 24, 1);
        // set all growing staked tiles plantedAt to 1 (instantly harvestable)
        // iterate all staked tiles of caller
        uint256[] memory arr = stakedTiles[msg.sender];
        for (uint256 i = 0; i < arr.length; i++) {
            uint256 tid = arr[i];
            if (plantedAt[tid] != 0) {
                plantedAt[tid] = 1;
            }
        }
    }
}
