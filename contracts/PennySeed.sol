pragma solidity ^0.5.0;

/*
    TODO
        Percentage for "owner"
        Retroactive pledges through conventional payment systems
*/

contract PennySeed {

    // Events
    event CreatedCampaignEvent (
        uint indexed _campaignIndex,
        address indexed _beneficiary,
        uint256 _goal,
        uint256 _balance,
        uint256 _startTime,
        uint256 _campaignPeriod,
        uint256 _pledgeAmount
    );
    event PledgedToCampaignEvent (
        uint indexed _campaignIndex,
        address indexed _pledger,
        uint256 _pledgeAmount,
        uint256 _balance,
        uint _numberOfPledgers
    );

    event ReachedGoalEvent (
        uint indexed _campaignIndex,
        uint256 _goal,
        uint256 _balance,
        uint _numberOfPledgers
    );

    event ClaimedFundsEvent (
        uint indexed _campaignIndex,
        address indexed _beneficiary,
        uint256 _goal,
        uint256 _balance
    );
    event RedeemedRebateEvent (
        uint indexed _campaignIndex,
        address indexed _pledger,
        uint256 _rebateAmount
    );
    event RedeemedRefundEvent (
        uint indexed _campaignIndex,
        address  indexed _pledger,
        uint256 _refundAmount
    );

    event DeadlineHasPassedEvent (
        uint indexed _campaignIndex,
        bool _hasReachedGoal,
        uint256 _goal,
        uint256 _balance
    );

    // Globals
    address public owner;

    struct Pledger {
        bool hasPledged;
        bool hasRedeemed;
    }

    struct Campaign {
        address payable beneficiary;

        uint256 goal;
        uint256 balance;

        uint256 startTime;
        uint256 campaignPeriod;

        bool hasClaimed;

        uint256 pledgeAmount;
        uint numberOfPledgers;
        mapping (address => Pledger) pledgers;
    }

    mapping (uint => Campaign) public campaigns;
    uint public numberOfCampaigns;

    // uint public ownersCut; // ([000...] => [111...]) => (0% => 100%)

    constructor () public {
        owner = msg.sender;
    }

    // Modifers
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier isBeneficiary (uint _campaignIndex) {
        require(msg.sender == campaigns[_campaignIndex].beneficiary, "called by non-beneficiary");
        _;
    }
    modifier isNotBeneficiary (uint _campaignIndex) {
        require(msg.sender != campaigns[_campaignIndex].beneficiary, "called by beneficiary");
        _;
    }

    modifier hasPledged (uint _campaignIndex) {
        require(campaigns[_campaignIndex].pledgers[msg.sender].hasPledged, "has not pledged");
        _;
    }
    modifier hasNotPledged (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].pledgers[msg.sender].hasPledged, "has pledged");
        _;
    }

    modifier deadlineHasPassed (uint _campaignIndex) {
        require(now > (campaigns[_campaignIndex].startTime + campaigns[_campaignIndex].campaignPeriod), "deadline has not passed");
        _;
    }
    modifier deadlineHasNotPassed (uint _campaignIndex) {
        require(now <= (campaigns[_campaignIndex].startTime + campaigns[_campaignIndex].campaignPeriod), "deadline has passed");
        _;
    }

    modifier goalHasBeenReached (uint _campaignIndex) {
        require(campaigns[_campaignIndex].balance >= campaigns[_campaignIndex].goal, "goal has not been reached");
        _;
    }
    modifier goalHasNotBeenReached (uint _campaignIndex) {
        require(campaigns[_campaignIndex].balance < campaigns[_campaignIndex].goal, "goal has been reached");
        _;
    }

    modifier hasRedeemed (uint _campaignIndex) {
        require(campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed);
        _;
    }
    modifier hasNotRedeemed (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed);
        _;
    }

    modifier hasClaimed (uint _campaignIndex) {
        require(campaigns[_campaignIndex].hasClaimed);
        _;
    }
    modifier hasNotClaimed (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].hasClaimed);
        _;
    }

    // Methods
    function createCampaign (uint256 _goal, uint256 _pledgeAmount, uint256 _campaignPeriod) public {
        campaigns[numberOfCampaigns] = Campaign (
            msg.sender,

            _goal,
            0,

            now,
            _campaignPeriod,

            false,

            _pledgeAmount,
            0
        );

        emit CreatedCampaignEvent (
            numberOfCampaigns,
            msg.sender,
            _goal, 0,
            now,
            _campaignPeriod,
            _pledgeAmount
        );

        numberOfCampaigns++;
    }
    function pledgeToCampaign (uint _campaignIndex) public payable isNotBeneficiary(_campaignIndex) deadlineHasNotPassed(_campaignIndex) hasNotPledged(_campaignIndex) {
        require(msg.value == campaigns[_campaignIndex].pledgeAmount, "Insuficient funds to Pledge");
        address(this).transfer(campaigns[_campaignIndex].pledgeAmount);

        campaigns[_campaignIndex].pledgers[msg.sender] = Pledger(false, false);
        campaigns[_campaignIndex].balance += campaigns[_campaignIndex].pledgeAmount;
        campaigns[_campaignIndex].numberOfPledgers++;

        emit PledgedToCampaignEvent (
            _campaignIndex,
            msg.sender,
            campaigns[_campaignIndex].pledgeAmount,
            campaigns[_campaignIndex].balance,
            campaigns[_campaignIndex].numberOfPledgers
        );

        if(campaigns[_campaignIndex].balance >= campaigns[_campaignIndex].goal) {
            emit ReachedGoalEvent (
                _campaignIndex,
                campaigns[_campaignIndex].goal,
                campaigns[_campaignIndex].balance,
                campaigns[_campaignIndex].numberOfPledgers
            );  
        }
    }

    function approveRetroactivePledge(uint _campaignIndex) public isBeneficiary(_campaignIndex) {
        // FILL
    }

    function pollForDeadline (uint _campaignIndex) public deadlineHasPassed(_campaignIndex) {
        emit DeadlineHasPassedEvent (
            _campaignIndex,
            (campaigns[_campaignIndex].balance >= campaigns[_campaignIndex].goal),
            campaigns[_campaignIndex].goal,
            campaigns[_campaignIndex].balance
        );
    }
    
    function claimFunds (uint _campaignIndex) public goalHasBeenReached(_campaignIndex) isBeneficiary(_campaignIndex) hasNotClaimed(_campaignIndex) {
        // transfer (goal*0.99) to sender, and (goal*0.01) to ownder for a "cut"
        msg.sender.transfer(campaigns[_campaignIndex].goal);
        campaigns[_campaignIndex].hasClaimed = true;

        emit ClaimedFundsEvent (
            _campaignIndex,
            msg.sender,
            campaigns[_campaignIndex].goal,
            campaigns[_campaignIndex].balance
        );
    }
    function redeemRebate (uint _campaignIndex) public deadlineHasPassed(_campaignIndex) goalHasBeenReached(_campaignIndex) hasPledged(_campaignIndex) {
        uint256 rebate = (campaigns[_campaignIndex].balance / campaigns[_campaignIndex].goal) / campaigns[_campaignIndex].numberOfPledgers;
        msg.sender.transfer(rebate);

        campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRebateEvent (
            _campaignIndex,
            msg.sender,
            rebate
        );
    }
    function redeemRefund (uint _campaignIndex) public deadlineHasPassed(_campaignIndex) goalHasNotBeenReached(_campaignIndex) hasPledged(_campaignIndex) {
        msg.sender.transfer(campaigns[_campaignIndex].pledgeAmount);
        campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRefundEvent (
            _campaignIndex,
            msg.sender,
            campaigns[_campaignIndex].pledgeAmount
        );
    }

    // Helpers
    function () external payable {}
}