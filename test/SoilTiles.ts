import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("SoilTiles", function () {
  async function deploy() {
    const [owner, player, other, marketplace] = await ethers.getSigners();
    const farmItems = await ethers.deployContract("FarmItems", owner);
    await farmItems.waitForDeployment();
    const tiles = await ethers.deployContract("SoilTiles", [await farmItems.getAddress()], owner);
    await tiles.waitForDeployment();

    const MINTER_ROLE = await farmItems.MINTER_ROLE();
    await farmItems.grantRole(MINTER_ROLE, await tiles.getAddress());
    const MARKETPLACE_ROLE = await tiles.MARKETPLACE_ROLE();
    await tiles.grantRole(MARKETPLACE_ROLE, marketplace.address);

    return { owner, player, other, marketplace, farmItems, tiles };
  }

  it("mints starter tiles once", async function () {
    const { player, tiles } = await deploy();
    await tiles.mintStarterTiles(player.address);
    expect(await tiles.balanceOf(player.address)).to.equal(2n);
    expect(await tiles.hasMintedStarter(player.address)).to.equal(true);

    // starter tiles are soulbound
    const id1 = await tiles.tokenOfOwnerByIndex(player.address, 0);
    expect((await tiles.tileInfo(id1)).isSoulbound).to.equal(true);

    await expect(tiles.mintStarterTiles(player.address)).to.be.revertedWith("already minted");
  });

  it("reverts transfer of soulbound tile", async function () {
    const { player, other, tiles } = await deploy();
    await tiles.mintStarterTiles(player.address);
    const id = await tiles.tokenOfOwnerByIndex(player.address, 0);
    await expect(
      tiles.connect(player).transferFrom(player.address, other.address, id)
    ).to.be.revertedWith("soulbound");
  });

  it("smelts rarity 0 (common) into 1x Temp Fertilizer (id 21)", async function () {
    const { player, marketplace, tiles, farmItems } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 0);
    const tokenId = 1;
    await tiles.connect(player).smeltTile(tokenId, 0);
    expect(await farmItems.balanceOf(player.address, 21)).to.equal(1n);
    await expect(tiles.ownerOf(tokenId)).to.be.revertedWithCustomError(tiles, "ERC721NonexistentToken");
  });

  it("smelts rarity 1 (uncommon) rewardChoice 0 -> 3x Temp Fertilizer (id 21)", async function () {
    const { player, marketplace, tiles, farmItems } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 1);
    await tiles.connect(player).smeltTile(1, 0);
    expect(await farmItems.balanceOf(player.address, 21)).to.equal(3n);
  });

  it("smelts rarity 1 (uncommon) rewardChoice 1 -> 1x id 22", async function () {
    const { player, marketplace, tiles, farmItems } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 1);
    await tiles.connect(player).smeltTile(1, 1);
    expect(await farmItems.balanceOf(player.address, 22)).to.equal(1n);
  });

  it("smelts rarity >=2 rewardChoice 0 -> 1x id 24", async function () {
    const { player, marketplace, tiles, farmItems } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 2);
    await tiles.connect(player).smeltTile(1, 0);
    expect(await farmItems.balanceOf(player.address, 24)).to.equal(1n);
  });

  it("smelts rarity >=2 rewardChoice 1 -> 1x id 23", async function () {
    const { player, marketplace, tiles, farmItems } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 3);
    await tiles.connect(player).smeltTile(1, 1);
    expect(await farmItems.balanceOf(player.address, 23)).to.equal(1n);
  });

  it("reverts smelt of soulbound starter tile", async function () {
    const { player, tiles } = await deploy();
    await tiles.mintStarterTiles(player.address);
    const id = await tiles.tokenOfOwnerByIndex(player.address, 0);
    await expect(tiles.connect(player).smeltTile(id, 0)).to.be.revertedWith("soulbound");
  });

  it("reverts smelt by non-owner", async function () {
    const { player, other, marketplace, tiles } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 0, 1);
    await expect(tiles.connect(other).smeltTile(1, 0)).to.be.revertedWith("not owner");
  });

  it("marketplace role can mint; non-role cannot", async function () {
    const { player, other, marketplace, tiles } = await deploy();
    await tiles.connect(marketplace).mintTile(player.address, 1, 2);
    expect(await tiles.balanceOf(player.address)).to.equal(1n);
    await expect(tiles.connect(other).mintTile(player.address, 1, 2)).to.be.revertedWithCustomError(tiles, "AccessControlUnauthorizedAccount");
  });
});
