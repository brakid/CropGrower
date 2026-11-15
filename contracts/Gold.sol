// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.38;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Gold is ERC20, Ownable {
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  /// @notice Addresses exempt from the 3% P2P transfer fee
  /// (FarmManager, Marketplace, DailyContracts, DEX LP router, ...).
  mapping(address => bool) public isFeeExempt;

  constructor() ERC20("$Gold", "GLD") Ownable(msg.sender) {
    _mint(msg.sender, 100_000_000 * 10 ** decimals());
  }

  /// @notice Toggle fee exemption for an address. Owner-only.
  function setIsFeeExempt(address account, bool exempt) external onlyOwner {
    isFeeExempt[account] = exempt;
  }

  /// @dev 3% fee on direct wallet-to-wallet (P2P) transfers.
  ///      If either side is fee-exempt, or the transfer is a mint/burn,
  ///      no fee is applied.
  function _update(address from, address to, uint256 amount) internal override {
    // Mints and burns: no fee.
    if (from == address(0) || to == address(0)) {
      super._update(from, to, amount);
      return;
    }

    // Self-transfer: no fee.
    if (from == to) {
      super._update(from, to, amount);
      return;
    }

    // Exempt addresses: no fee.
    if (isFeeExempt[from] || isFeeExempt[to]) {
      super._update(from, to, amount);
      return;
    }

    // P2P transfer: 3% to dead address, 97% to recipient.
    uint256 fee = (amount * 3) / 100;
    uint256 netAmount = amount - fee;

    super._update(from, DEAD, fee);
    super._update(from, to, netAmount);
  }
}
