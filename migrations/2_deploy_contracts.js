var Campaign = artifacts.require("./Campaign.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Campaign, "100000000000000000000", 1*24*60*60, "6500000000000000");
};