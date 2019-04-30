pragma solidity ^0.5.0;

contract PennySeed {

    // Events
    event CreatedCampaignEvent (
        uint indexed _campaignId,
        address indexed _beneficiary,
        uint256 _goal,
        uint256 _balance,
        uint256 _startTime,
        uint256 _campaignPeriod,
        uint256 _pledgeAmount
    );
    event PledgedToCampaignEvent (
        uint indexed _campaignId,
        address indexed _pledger,
        uint256 _pledgeAmount,
        uint256 _balance,
        uint _pledgeCount
    );

    event ReachedGoalEvent (
        uint indexed _campaignId,
        uint256 _goal,
        uint256 _balance,
        uint _pledgeCount
    );

    event ClaimedFundsEvent (
        uint indexed _campaignId,
        address indexed _beneficiary,
        uint256 _goal,
        uint256 _balance
    );
    event RedeemedRebateEvent (
        uint indexed _campaignId,
        address indexed _pledger,
        uint256 _rebateAmount
    );
    event RedeemedRefundEvent (
        uint indexed _campaignId,
        address  indexed _pledger,
        uint256 _refundAmount
    );

    event DeadlineHasPassedEvent (
        uint indexed _campaignId,
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
        uint pledgeCount;
        mapping (address => Pledger) pledgers;
    }

    mapping (uint => Campaign) public campaigns;
    uint public campaignsCount;

    constructor () public {
        owner = msg.sender;
    }

    // Modifers
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier isBeneficiary (uint _campaignId) {
        require(msg.sender == campaigns[_campaignId].beneficiary, "called by non-beneficiary");
        _;
    }
    modifier isNotBeneficiary (uint _campaignId) {
        require(msg.sender != campaigns[_campaignId].beneficiary, "called by beneficiary");
        _;
    }

    modifier hasPledged (uint _campaignId) {
        require(campaigns[_campaignId].pledgers[msg.sender].hasPledged, "has not pledged");
        _;
    }
    modifier hasNotPledged (uint _campaignId) {
        require(!campaigns[_campaignId].pledgers[msg.sender].hasPledged, "has pledged");
        _;
    }

    modifier deadlineHasPassed (uint _campaignId) {
        require(now > (campaigns[_campaignId].startTime + campaigns[_campaignId].campaignPeriod), "deadline has not passed");
        _;
    }
    modifier deadlineHasNotPassed (uint _campaignId) {
        require(now <= (campaigns[_campaignId].startTime + campaigns[_campaignId].campaignPeriod), "deadline has passed");
        _;
    }

    modifier goalHasBeenReached (uint _campaignId) {
        require(campaigns[_campaignId].balance >= campaigns[_campaignId].goal, "goal has not been reached");
        _;
    }
    modifier goalHasNotBeenReached (uint _campaignId) {
        require(campaigns[_campaignId].balance < campaigns[_campaignId].goal, "goal has been reached");
        _;
    }

    modifier hasRedeemed (uint _campaignId) {
        require(campaigns[_campaignId].pledgers[msg.sender].hasRedeemed);
        _;
    }
    modifier hasNotRedeemed (uint _campaignId) {
        require(!campaigns[_campaignId].pledgers[msg.sender].hasRedeemed);
        _;
    }

    modifier hasClaimed (uint _campaignId) {
        require(campaigns[_campaignId].hasClaimed);
        _;
    }
    modifier hasNotClaimed (uint _campaignId) {
        require(!campaigns[_campaignId].hasClaimed);
        _;
    }

    // Methods
    function createCampaign (uint256 _goal, uint256 _pledgeAmount, uint256 _campaignPeriod) public {
        campaigns[campaignsCount] = Campaign (
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
            campaignsCount,
            msg.sender,
            _goal, 0,
            now,
            _campaignPeriod,
            _pledgeAmount
        );

        campaignsCount++;
    }
    function pledgeToCampaign (uint _campaignId) public payable isNotBeneficiary(_campaignId) deadlineHasNotPassed(_campaignId) hasNotPledged(_campaignId) {
        require(msg.value == campaigns[_campaignId].pledgeAmount, "Insuficient funds to Pledge");
        address(this).transfer(campaigns[_campaignId].pledgeAmount);

        campaigns[_campaignId].pledgers[msg.sender] = Pledger(false, false);
        campaigns[_campaignId].balance += campaigns[_campaignId].pledgeAmount;
        campaigns[_campaignId].pledgeCount++;

        emit PledgedToCampaignEvent (
            _campaignId,
            msg.sender,
            campaigns[_campaignId].pledgeAmount,
            campaigns[_campaignId].balance,
            campaigns[_campaignId].pledgeCount
        );

        if(campaigns[_campaignId].balance >= campaigns[_campaignId].goal) {
            emit ReachedGoalEvent (
                _campaignId,
                campaigns[_campaignId].goal,
                campaigns[_campaignId].balance,
                campaigns[_campaignId].pledgeCount
            );  
        }
    }

    function pollForDeadline (uint _campaignId) public deadlineHasPassed(_campaignId) {
        emit DeadlineHasPassedEvent (
            _campaignId,
            (campaigns[_campaignId].balance >= campaigns[_campaignId].goal),
            campaigns[_campaignId].goal,
            campaigns[_campaignId].balance
        );
    }
    
    function claimFunds (uint _campaignId) public goalHasBeenReached(_campaignId) isBeneficiary(_campaignId) hasNotClaimed(_campaignId) {
        msg.sender.transfer(campaigns[_campaignId].goal);
        campaigns[_campaignId].hasClaimed = true;

        emit ClaimedFundsEvent (
            _campaignId,
            msg.sender,
            campaigns[_campaignId].goal,
            campaigns[_campaignId].balance
        );
    }
    function redeemRebate (uint _campaignId) public deadlineHasPassed(_campaignId) goalHasBeenReached(_campaignId) hasPledged(_campaignId) {
        uint256 rebate = (campaigns[_campaignId].balance / campaigns[_campaignId].goal) / campaigns[_campaignId].pledgeCount;
        msg.sender.transfer(rebate);

        campaigns[_campaignId].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRebateEvent (
            _campaignId,
            msg.sender,
            rebate
        );
    }
    function redeemRefund (uint _campaignId) public deadlineHasPassed(_campaignId) goalHasNotBeenReached(_campaignId) hasPledged(_campaignId) {
        msg.sender.transfer(campaigns[_campaignId].pledgeAmount);
        campaigns[_campaignId].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRefundEvent (
            _campaignId,
            msg.sender,
            campaigns[_campaignId].pledgeAmount
        );
    }    

    // Helpers
    function () external payable {}
}