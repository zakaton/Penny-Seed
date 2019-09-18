pragma solidity ^0.5.11;

contract PennySeed {
    address public owner;

    struct Pledger {
        bool hasPledged;
        bool hasRedeemed;
    }

    struct Campaign {
        address payable campaigner;

        uint256 targetAmount;
        uint256 pledgedAmount;

        uint256 startTime;
        uint256 endTime;

        bool hasClaimed;

        uint256 minimumNumberOfPledgers;
        uint256 numberOfPledgers;

        mapping (address => Pledger) pledgers;
    }

    mapping (uint => Campaign) public campaigns;
    uint public numberOfCampaigns;

    constructor() public {
        owner = msg.sender;
    }

    event CreatedCampaign (
        uint indexed campaignIndex,
        address indexed campaigner,

        uint256 startTime,
        uint256 endTime,

        uint256 targetAmount,
        uint256 minimumNumberOfPledgers
    );

    function createCampaign (uint256 _targetAmount, uint256 _minimumNumberOfPledgers, uint256 _period) public {
        require(_minimumNumberOfPledgers > 0, "Minimum Number of Pledgers must be greater than 0");
        require(_period > 0, "_period must be greater than 0");

        campaigns[numberOfCampaigns] = Campaign (
            msg.sender, // campaigner

            _targetAmount,
            0, // pledgedAmount

            now, // startTime
            now + _period, // endTime

            false, // hasClaimed

            _minimumNumberOfPledgers, // minimumNumberOfPledgers
            0 // numberOfPledgers
        );

        emit CreatedCampaign (
            numberOfCampaigns,
            msg.sender,

            now,
            now + _period,

            _targetAmount,
            _minimumNumberOfPledgers
        );

        numberOfCampaigns++;
    }

    event PledgedToCampaign (
        uint indexed campaignIndex,
        address indexed pledger
    );
    modifier validCampaignIndex (uint _campaignIndex) {
        require(_campaignIndex >= 0 && _campaignIndex < numberOfCampaigns, "Invalid Campaign Index");
        _;
    }
    modifier isNotCampaigner (uint _campaignIndex) {
        require(campaigns[_campaignIndex].campaigner != msg.sender, "Cannot pledge to own Campaign");
        _;
    }
    modifier hasNotPledgedToCampaign (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].pledgers[msg.sender].hasPledged, "User has already pledged to Campaign");
        _;
    }
    modifier campaignHasNotEnded (uint _campaignIndex) {
        require(now < campaigns[_campaignIndex].endTime, "Campaign already ended");
        _;
    }
    function _getCampaignMaxPledgeAmount(uint _campaignIndex) private view validCampaignIndex(_campaignIndex) returns (uint maxPledgeAmount) {
        maxPledgeAmount = campaigns[_campaignIndex].targetAmount / campaigns[_campaignIndex].minimumNumberOfPledgers;
    }
    function pledgeToCampaign (uint _campaignIndex) public payable validCampaignIndex(_campaignIndex) isNotCampaigner(_campaignIndex) campaignHasNotEnded(_campaignIndex) hasNotPledgedToCampaign(_campaignIndex) {
        require(msg.value == _getCampaignMaxPledgeAmount(_campaignIndex), "Insufficient Funds to Pledge");
        
        campaigns[_campaignIndex].pledgers[msg.sender] = Pledger(true, false);
        campaigns[_campaignIndex].pledgedAmount += _getCampaignMaxPledgeAmount(_campaignIndex);
        campaigns[_campaignIndex].numberOfPledgers++;
        
        emit PledgedToCampaign(
            _campaignIndex,
            msg.sender
        );

        address(this).transfer(_getCampaignMaxPledgeAmount(_campaignIndex));
    }

    modifier isOwner () {
        require(msg.sender == owner, "called by non-owner");
        _;
    }
    function addExternalPledger (uint _campaignIndex) public isOwner validCampaignIndex(_campaignIndex) campaignHasNotEnded(_campaignIndex) {
        campaigns[_campaignIndex].numberOfPledgers++;

        emit PledgedToCampaign(
            _campaignIndex,
            msg.sender
        );
    }

    event ClaimedFunds (
        uint indexed _campaignIndex
    );
    modifier isCampaigner(uint _campaignIndex) {
        require(campaigns[_campaignIndex].campaigner == msg.sender, "Function called by non-campaigner");
        _;
    }
    modifier campaignHasEnded(uint _campaignIndex) {
        require(now >= campaigns[_campaignIndex].endTime, "Campaign has not ended yet");
        _;
    }
    modifier campaignIsSuccessful(uint _campaignIndex) {
        require(campaigns[_campaignIndex].numberOfPledgers >= campaigns[_campaignIndex].minimumNumberOfPledgers, "Campaign has not reached its goal");
        _;
    }
    modifier hasNotClaimedFunds(uint _campaignIndex) {
        require(!campaigns[_campaignIndex].hasClaimed, "Campaigner already claimed funds");
        _;
    }
    function claimFunds (uint _campaignIndex) public isCampaigner(_campaignIndex) campaignHasEnded(_campaignIndex) campaignIsSuccessful(_campaignIndex) hasNotClaimedFunds(_campaignIndex) {
        campaigns[_campaignIndex].hasClaimed = true;
        
        emit ClaimedFunds(
            _campaignIndex
        );

        msg.sender.transfer(campaigns[_campaignIndex].pledgedAmount);
    }

    event RedeemedRebate (
        uint indexed campaignIndex,
        address indexed pledger
    );
    modifier hasPledgedToCampaign (uint _campaignIndex) {
        require(campaigns[_campaignIndex].pledgers[msg.sender].hasPledged, "User has not pledged to Campaign");
        _;
    }
    modifier hasNotRedeemedRebate (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed, "User has already redeemed Rebate");
        _;
    }
    function _getCampaignRebateAmount (uint _campaignIndex) private view validCampaignIndex(_campaignIndex) returns (uint rebateAmount) {
        rebateAmount = _getCampaignMaxPledgeAmount(_campaignIndex) - (campaigns[_campaignIndex].targetAmount / campaigns[_campaignIndex].numberOfPledgers);
    }
    function redeemRebate (uint _campaignIndex) public validCampaignIndex(_campaignIndex) campaignHasEnded(_campaignIndex) campaignIsSuccessful(_campaignIndex) hasPledgedToCampaign(_campaignIndex) hasNotRedeemedRebate(_campaignIndex) {
        campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRebate(
            _campaignIndex,
            msg.sender
        );

        msg.sender.transfer(_getCampaignRebateAmount(_campaignIndex));
    }

    event RedeemedRefund (
        uint indexed _campaignIndex,
        address indexed pledger
    );
    modifier campaignIsNotSuccessful(uint _campaignIndex) {
        require(campaigns[_campaignIndex].numberOfPledgers < campaigns[_campaignIndex].minimumNumberOfPledgers, "Campaign was successful");
        _;
    }
    modifier hasNotRedeemedRefund (uint _campaignIndex) {
        require(!campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed, "Pledger has already redeemed Refund");
        _;
    }
    function _getCampaignRefundAmount (uint _campaignIndex) private view validCampaignIndex(_campaignIndex) returns (uint refundAmount) {
        refundAmount = _getCampaignMaxPledgeAmount(_campaignIndex);
    }
    function redeemRefund (uint _campaignIndex) public validCampaignIndex(_campaignIndex) campaignHasEnded(_campaignIndex) campaignIsNotSuccessful(_campaignIndex) hasPledgedToCampaign(_campaignIndex) hasNotRedeemedRefund(_campaignIndex) {
        campaigns[_campaignIndex].pledgers[msg.sender].hasRedeemed = true;

        emit RedeemedRefund(
            _campaignIndex,
            msg.sender
        );

        msg.sender.transfer(_getCampaignRefundAmount(_campaignIndex));
    }

    function () external payable {}
}