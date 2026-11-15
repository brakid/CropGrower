# VRF Integration - Next to Implement

The following features are intentionally deferred and require Chainlink VRF v2.5:

1. FarmItems.millSeeds - replace pseudo-RNG (keccak256) with verifiable randomness for 0/1/2 seed drops.
2. Marketplace.openMysteryBox - request VRF randomness to mint SoilTile with rarity roll.
3. DailyContracts completeQuest - mystery box drop chance (20-100%) roll.
4. FarmManager harvestBatch - RNG bonus seed drops (10/20/40%).
5. FarmManager.applyPermanentBoost - if gold path, no RNG needed but VRF not required.

Integration steps: add VRF consumer interface, requestRandomWords, fulfillRandomWords callback, store pending requests.