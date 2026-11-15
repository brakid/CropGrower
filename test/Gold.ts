import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Gold", function () {
  it("Should emit the Transfer event when calling the constructor", async function () {
    const [signer] = await ethers.getSigners()
    
    const gold = await ethers.deployContract("Gold", signer);
    await gold.waitForDeployment();
    const deployTx = gold.deploymentTransaction()!;
    const receipt = await deployTx.wait();

    const transferEvents = 
        receipt!.logs
            .map(log => gold.interface.parseLog(log))
            .filter(parsed => parsed && parsed.name === "Transfer");

    expect(transferEvents).length(1);
    const event = transferEvents[0]!;
    expect(event.args.from).to.equal(ethers.ZeroAddress);
    expect(event.args.to).to.equal(signer.address);
    expect(event.args.value).to.equal(ethers.parseEther("100000000"));
  });

  it("Should apply 3% fee on direct P2P transfer", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    const amount = ethers.parseEther("100");
    await gold.transfer(alice.address, amount);

    const DEAD = "0x000000000000000000000000000000000000dEaD";
    const fee = (amount * 3n) / 100n;
    const net = amount - fee;

    const aliceBefore = await gold.balanceOf(alice.address);
    const bobBefore = await gold.balanceOf(bob.address);
    const deadBefore = await gold.balanceOf(DEAD);

    await gold.connect(alice).transfer(bob.address, amount);

    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore - amount);
    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore + net);
    expect(await gold.balanceOf(DEAD)).to.equal(deadBefore + fee);
  });

  it("Should not apply fee for exempt addresses", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    await gold.setIsFeeExempt(alice.address, true);

    const amount = ethers.parseEther("100");
    await gold.transfer(alice.address, amount);

    const aliceBefore = await gold.balanceOf(alice.address);
    const bobBefore = await gold.balanceOf(bob.address);

    await gold.connect(alice).transfer(bob.address, amount);

    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore - amount);
    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore + amount);
  });

  it("Should not apply fee when recipient (to) is exempt", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    await gold.setIsFeeExempt(bob.address, true);

    const amount = ethers.parseEther("100");
    await gold.transfer(alice.address, amount);

    const aliceBefore = await gold.balanceOf(alice.address);
    const bobBefore = await gold.balanceOf(bob.address);
    const deadBefore = await gold.balanceOf("0x000000000000000000000000000000000000dEaD");

    await gold.connect(alice).transfer(bob.address, amount);

    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore - amount);
    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore + amount);
    expect(await gold.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(deadBefore);
  });

  it("Should apply fee in reverse direction too", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    const amount = ethers.parseEther("100");
    await gold.transfer(alice.address, amount);
    await gold.transfer(bob.address, amount);

    const fee = (amount * 3n) / 100n;
    const net = amount - fee;

    // bob -> alice
    const bobBefore = await gold.balanceOf(bob.address);
    const aliceBefore = await gold.balanceOf(alice.address);
    const deadBefore = await gold.balanceOf("0x000000000000000000000000000000000000dEaD");

    await gold.connect(bob).transfer(alice.address, amount);

    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore - amount);
    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore + net);
    expect(await gold.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(deadBefore + fee);
  });

  it("Should handle zero-fee (small amount) P2P transfer", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    const small = 1n; // fee = (1*3)/100 = 0
    await gold.transfer(alice.address, small);

    const aliceBefore = await gold.balanceOf(alice.address);
    const bobBefore = await gold.balanceOf(bob.address);
    const deadBefore = await gold.balanceOf("0x000000000000000000000000000000000000dEaD");

    await gold.connect(alice).transfer(bob.address, small);

    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore - small);
    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore + small);
    expect(await gold.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(deadBefore);
  });

  it("Should round fee down for non-divisible amounts", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();

    await gold.setIsFeeExempt(owner.address, true);
    const amount = ethers.parseEther("100");
    await gold.transfer(alice.address, amount);

    const odd = 101n; // fee = (101*3)/100 = 3 (floor), net = 98
    const fee = (odd * 3n) / 100n;
    const net = odd - fee;

    const aliceBefore = await gold.balanceOf(alice.address);
    const bobBefore = await gold.balanceOf(bob.address);
    const deadBefore = await gold.balanceOf("0x000000000000000000000000000000000000dEaD");

    await gold.connect(alice).transfer(bob.address, odd);

    expect(await gold.balanceOf(alice.address)).to.equal(aliceBefore - odd);
    expect(await gold.balanceOf(bob.address)).to.equal(bobBefore + net);
    expect(await gold.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(deadBefore + fee);
  });

  it("Should have no burn function (burn not applicable)", async function () {
    const [owner] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.waitForDeployment();
    // @ts-expect-error - burn not defined
    expect(typeof gold.burn).to.not.equal("function");
  });

});
