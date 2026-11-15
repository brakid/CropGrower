// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

interface IFarmItems {
    function mintReward(address to, uint256 id, uint256 amount) external;
}

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract SoilTiles is ERC721Enumerable, ERC2981, AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    struct TileData {
        uint8 cropType;
        uint8 rarity;
        bool isSoulbound;
        bool hasPermanentBoost;
    }
    mapping(uint256 => TileData) public tileInfo;

    uint256 private _nextTokenId = 1;
    mapping(address => bool) public hasMintedStarter;

    address public farmItems;

    constructor(address farmItems_) ERC721("SoilTiles", "TILE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        farmItems = farmItems_;
    }

    function mintStarterTiles(address player) external {
        require(!hasMintedStarter[player], "already minted");
        hasMintedStarter[player] = true;
        for (uint256 i = 0; i < 2; i++) {
            uint256 id = _nextTokenId++;
            _safeMint(player, id);
            tileInfo[id] = TileData(0, 0, true, false);
        }
    }

    function mintTile(address to, uint8 cropType, uint8 rarity) external onlyRole(MARKETPLACE_ROLE) {
        uint256 id = _nextTokenId++;
        _safeMint(to, id);
        tileInfo[id] = TileData(cropType, rarity, false, false);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && tileInfo[tokenId].isSoulbound) {
            revert("soulbound");
        }
        return super._update(to, tokenId, auth);
    }

    function smeltTile(uint256 tokenId, uint8 rewardChoice) external {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        TileData memory d = tileInfo[tokenId];
        require(!d.isSoulbound, "soulbound");

        _burn(tokenId);
        delete tileInfo[tokenId];

        // reward minting via FarmItems (MINTER_ROLE must be granted to this contract)
        if (d.rarity == 0) {
            // Common: 1x Temp Fertilizer (ID 21)
            IFarmItems(farmItems).mintReward(msg.sender, 21, 1);
        } else if (d.rarity == 1) {
            if (rewardChoice == 0) {
                IFarmItems(farmItems).mintReward(msg.sender, 21, 3);
            } else {
                IFarmItems(farmItems).mintReward(msg.sender, 22, 1);
            }
        } else {
            if (rewardChoice == 0) {
                IFarmItems(farmItems).mintReward(msg.sender, 24, 1);
            } else {
                IFarmItems(farmItems).mintReward(msg.sender, 23, 1);
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
