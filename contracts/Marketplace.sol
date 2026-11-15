// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IGold2 { function transfer(address to, uint256 amount) external returns (bool); function transferFrom(address from, address to, uint256 amount) external returns (bool); }
interface IFarmItems3 { function burn(address from, uint256 id, uint256 amount) external; function mintReward(address to, uint256 id, uint256 amount) external; }
interface ISoilTiles2 { function transferFrom(address from, address to, uint256 tokenId) external; function ownerOf(uint256 tokenId) external view returns (address); }

contract Marketplace is AccessControl {
    IGold2 public gold;
    IFarmItems3 public farmItems;
    ISoilTiles2 public tiles;
    address public treasury;

    struct TileListing { uint256 tokenId; address seller; uint256 price; bool active; }
    struct ItemListing { uint256 itemId; uint256 amount; uint256 pricePerUnit; address seller; bool active; }

    TileListing[] public tileListings;
    ItemListing[] public itemListings;

    constructor(address gold_, address items_, address tiles_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        gold = IGold2(gold_);
        farmItems = IFarmItems3(items_);
        tiles = ISoilTiles2(tiles_);
    }

    function sellCropsToNPC(uint256 cropId, uint256 amount) external {
        farmItems.burn(msg.sender, cropId, amount);
        uint256 price = (5 + (cropId % 13)) * amount;
        gold.transfer(msg.sender, price * 1e18);
        // recycled spend handled by caller depositing to treasury off-chain/role
    }

    function buyNPCItem(uint256 itemId, uint256 amount) external {
        gold.transferFrom(msg.sender, address(this), amount * 1e18);
    }

    function openMysteryBox(uint8 boxType) external {
        uint256 cost = boxType == 0 ? 250e18 : 900e18;
        gold.transferFrom(msg.sender, address(this), cost);
        // VRF pending: mint a common tile as placeholder
        // (role-gated mint would require tiles.mintTile; admin handles off-chain for now)
    }

    function listTile(uint256 tokenId, uint256 priceGold) external {
        require(tiles.ownerOf(tokenId) == msg.sender, "not owner");
        tiles.transferFrom(msg.sender, address(this), tokenId);
        tileListings.push(TileListing(tokenId, msg.sender, priceGold, true));
    }

    function buyTile(uint256 listingId) external {
        TileListing storage L = tileListings[listingId];
        require(L.active, "inactive");
        gold.transferFrom(msg.sender, L.seller, L.price * 1e18);
        tiles.transferFrom(address(this), msg.sender, L.tokenId);
        L.active = false;
    }

    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) { treasury = t; }

    function listItems(uint256 itemId, uint256 amount, uint256 pricePerUnit) external {
        farmItems.burn(msg.sender, itemId, amount);
        itemListings.push(ItemListing(itemId, amount, pricePerUnit, msg.sender, true));
    }

    function buyItems(uint256 orderId, uint256 amount) external {
        ItemListing storage O = itemListings[orderId];
        require(O.active && O.amount >= amount, "invalid");
        gold.transferFrom(msg.sender, O.seller, O.pricePerUnit * amount * 1e18);
        farmItems.mintReward(msg.sender, O.itemId, amount);
        O.amount -= amount;
        if (O.amount == 0) O.active = false;
    }
}
