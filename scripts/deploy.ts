import { network } from "hardhat";

const { ethers } = await network.create();
const [deployer] = await ethers.getSigners();

console.log("Deploying with account:", deployer.address);

const gold = await ethers.deployContract("Gold");
await gold.waitForDeployment();
const goldAddr = await gold.getAddress();

// Tokenomics distribution (DEX LP 20M left with deployer)
const rewardPoolAmt = ethers.parseEther("50000000");
const teamAmt = ethers.parseEther("15000000");
const treasuryAmt = ethers.parseEther("10000000");
const communityAmt = ethers.parseEther("5000000");

const items = await ethers.deployContract("FarmItems");
await items.waitForDeployment();
const itemsAddr = await items.getAddress();

const tiles = await ethers.deployContract("SoilTiles", [itemsAddr]);
await tiles.waitForDeployment();
const tilesAddr = await tiles.getAddress();

const farm = await ethers.deployContract("FarmManager", [goldAddr, tilesAddr, itemsAddr]);
await farm.waitForDeployment();
const farmAddr = await farm.getAddress();

const market = await ethers.deployContract("Marketplace", [goldAddr, itemsAddr, tilesAddr]);
await market.waitForDeployment();
const marketAddr = await market.getAddress();

const treasury = await ethers.deployContract("TreasuryRewardPool", [goldAddr]);
await treasury.waitForDeployment();
const treasuryAddr = await treasury.getAddress();

// distribute gold per tokenomics (DEX 20M stays with deployer)
await gold.transfer(treasuryAddr, rewardPoolAmt);
// team/community/treasury ecosystem transfers (team vesting handled off-chain; here direct for simplicity)
await gold.transfer(treasuryAddr, treasuryAmt);
await gold.transfer(deployer.address, teamAmt + communityAmt);

const daily = await ethers.deployContract("DailyContracts", [goldAddr]);
await daily.waitForDeployment();
const dailyAddr = await daily.getAddress();

// roles
const MINTER_ROLE = await items.MINTER_ROLE();
await items.grantRole(MINTER_ROLE, farmAddr);
await items.grantRole(MINTER_ROLE, tilesAddr);
await items.grantRole(MINTER_ROLE, marketAddr);

const MARKETPLACE_ROLE = await tiles.MARKETPLACE_ROLE();
await tiles.grantRole(MARKETPLACE_ROLE, marketAddr);

// exemptions
await gold.setIsFeeExempt(farmAddr, true);
await gold.setIsFeeExempt(marketAddr, true);
await gold.setIsFeeExempt(dailyAddr, true);
await gold.setIsFeeExempt(treasuryAddr, true);

// treasury wiring
await farm.setTreasury(treasuryAddr);
await market.setTreasury(treasuryAddr);
await daily.setTreasury(treasuryAddr);

// payout roles
const PAYOUT_ROLE = await treasury.PAYOUT_ROLE();
await treasury.grantRole(PAYOUT_ROLE, farmAddr);
await treasury.grantRole(PAYOUT_ROLE, marketAddr);
await treasury.grantRole(PAYOUT_ROLE, dailyAddr);

console.log("Gold:", goldAddr);
console.log("FarmItems:", itemsAddr);
console.log("SoilTiles:", tilesAddr);
console.log("FarmManager:", farmAddr);
console.log("Marketplace:", marketAddr);
console.log("DailyContracts:", dailyAddr);
console.log("TreasuryRewardPool:", treasuryAddr);
console.log("Team/Treasury/Community recipient (deployer):", deployer.address);
