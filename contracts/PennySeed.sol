pragma solidity >=0.4.21 <0.6.0;

contract PennySeed {

/** -------------------- Events -------------------- **/

	event NewCampaign(
		uint256 newCampaignId, 
		address beneficiary, 
		uint deadline, 
		uint fundingGoal,
		uint minPledges);
	event FailedCampaign(address beneficiary);
	event SuccessfulCampaign(address beneficiary);
	event NewPledge(address pledge, uint256 campaignId);

/** -------------------- Structs -------------------- **/

	// structure to represent campaign
	struct Campaign {
			address beneficiary; // beneficiary address
			uint deadline; // block number for deadline
	    uint fundingGoal; // funding goal in wei
	    uint minPledges; // minimum pleges
	   	Pledge[] pledges; // should this be mapped
	   	// mapping (address => boolean) pledges;
	}

	// structure to represent pledges
	struct Pledge {
		address pledgeAddress;
		uint pledgeAmount; // do we need this
	}

/** -------------------- Variables -------------------- **/

	// map Campaign IDs to address that owns them
	mapping (uint256 => address) public campaignIndexToBeneficiary;

	// track all campaigns in an array
	Campaign[] campaigns;

/** -------------------- Modifiers -------------------- **/

	// modifier to check deadline
	modifier afterDeadline(uint deadline) { if (block.number >= deadline) _; }
	// modifier to check campaign owner is address
	// modifier campaignOwnerOnly(uint256 campaignId) {_;}

/** -------------------- Functions -------------------- **/

	function createCampaign (
		address _beneficiary,
		uint _deadline,
		uint _fundingGoal,
		uint _minPledges
	)
		public
		returns (uint256)
	{
		// new pledge array
		Pledge[] _pledges;

		Campaign newCampaign = Campaign({
			beneficiary: _beneficiary,
			deadline: _deadline,
			fundingGoal: _fundingGoal,
			minPledges: _minPledges,
			pledges: _pledges
		});

		uint256 newCampaignId = campaigns.push(newCampaign) - 1;

		// emit new campaign event
		emit NewCampaign(
			_beneficiary, 
			newCampaignId

		);

		return newCampaignId;
	}

	// End campaign and either pay out or refund
	// should be campaign owner oldy
	function endCampaign(uint campaignId) internal  {/* TODO */}

	// Pay pay beneficiaries
	function payBeneficiary() internal {/* TODO */}

	// Pledge to a campaign
	function pledge() public {/* TODO */}

	// Refund Pledges by looping through pledge array
	function refundPledges(uint campaignId) {/* TODO */}

	// Return campaign data given campaign ID
	function getCampaign(uint campaignId) {/* TODO */}

	// Return true if campaign is closed (uses block numbers)
	function isCampaignClosed(uint campaignId) public returns () {
		if (block.number >= campaigns[campaignId].deadline) {
			return true;
		}
		return false;
	}

	// Return pledge amount given campaign ID
	function getMaxPledgeAmount(uint campaignId) public returns (uint) {
		return campaigns[campaignId].fundingGoal / campaigns[campaignId].minPledges;
	}

	// Return true if number of pledges is greater than min pledges
	function isFundingGoalReached(uint campaignId) public returns (bool) {
		if (campaigns[campaignId].pledges.length > campaigns[campaignId].minPledges) {
			return true;
		}
		return false;
	}

/** -------------------- Notes -------------------- **
	*	Send Token as proof of support
	*	Use timestamps?
	*	
*** ----------------------------------------------- **/
}