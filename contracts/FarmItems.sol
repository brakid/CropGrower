// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract FarmItems is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mintReward(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external {
        _burn(from, id, amount);
    }

    function millSeeds(uint8 cropIndex, uint256 amount) external {
        // burn crops (id 1..5)
        uint256 cropId = uint256(cropIndex) + 1;
        _burn(msg.sender, cropId, amount);
        // pseudo RNG: 0/1/2 seeds per crop avg 1.15
        uint256 seedId = uint256(cropIndex) + 11;
        uint256 totalSeeds = 0;
        for (uint256 i = 0; i < amount; i++) {
            uint256 r = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, i))) % 100;
            if (r < 25) totalSeeds += 0;
            else if (r < 60) totalSeeds += 1;
            else totalSeeds += 2;
        }
        if (totalSeeds > 0) _mint(msg.sender, seedId, totalSeeds, "");
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
