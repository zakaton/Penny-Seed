pragma solidity ^0.5.0;

/*
  DESCRIPTION
    A single Contract to store all Campaigns
    Each Campaign has their own balance
    Redeem funds when reached even before deadline
    Redeem rebate when reached even before deadline (can't split anymore)
    Use unredeemed rebate to pledge to others (hold a pool for rebates/refunds)
  
  Events
    CreatedCampaign (campaignIndex, recipient, totalAmount, deadline)
    Pledged (campaign, pledger, currentAmount)
    RedeemedRefund (campaign, pledger, refund)
    RedeemedFunds (campaign, recipient, fund)
    RedeemedRebate (campaign, pledger, rebate)
    ReachedGoal (campaign, time)
    DeadlineHasPassed (campaign, amount, hasReached)
  
  Store
    Campaigns
    PledgeBalance (use unredeemed funds, rebates, and refunds)
      can calculate balance rather than put in virtual bank
    
  Methods
    createCampaign(target, deadline, maxPledgeAmount) => (uint campaignIndex)
    pledge(campaignId) => (bool success)
    redeemFunds(campaignId) => (uint fundAmount)
    redeemRebate(campaignId) => (uint rebateAmount)
    redeemRefund(campaignId) => (uint refundAmount)

  QUESTIONS
    Pledging multiple times?
    Can a pledger "unPledge"?
    Can the recipient pledge?
    Continue to pledge after funds are redeemed?
    Continue to pledge after deadline has passed?
  
  FEATURES
    Use emitted events as proof of pledging
    Use funds in contract (refund/rebate/funds) to pledge to others
    Balances are computed so indefinite campaigns are like dividends
*/

contract Campaign {
  address public recipient;

  uint256 public targetAmount;
  uint256 public maxPledgeAmount;

  uint public startTime;
  uint public campaignPeriod;

  function elapsedTime () public view returns (uint) {
    return now - startTime;
  }

  function remainingTime () public view returns (uint) {
    return campaignPeriod - elapsedTime();
  }

  function getNow () public view returns (uint256) {
    return now;
  }

  mapping (address => bool) public pledgers;
  uint public rebate;

  constructor (uint256 _targetAmount, uint _campaignPeriod, uint256 _maxPledgeAmount) public {
    recipient = msg.sender;

    startTime = now;

    targetAmount = _targetAmount;
    campaignPeriod = _campaignPeriod;
    maxPledgeAmount = _maxPledgeAmount;
  }


  // MODIFIERS

  modifier pastDeadline {
    require(now - startTime >= campaignPeriod);
    _;
  }
  modifier notPassedDeadline {
    require(now - startTime < campaignPeriod);
    _;
  }

  modifier campaignSuccessful {
    require(address(this).balance >= targetAmount);
    _;
  }
  modifier campaignUnsuccessful {
    require (address(this).balance < targetAmount);
    _;
  }

  modifier isRecipient {
    require(msg.sender == recipient);
    _;
  }
  modifier isNotRecipient {
    require(msg.sender != recipient);
    _;
  }

  modifier isPledger {
    require(pledgers[msg.sender]);
    _;
  }
  modifier isNotPledger {
    require(!pledgers[msg.sender]);
    _;
  }


  // PLEDGING

  event pledgedEvent (
    address _pledger
  );

  function () external payable {

  }

  function pledge () payable public notPassedDeadline isNotPledger isNotRecipient {
    require(msg.value == maxPledgeAmount);
    address(this).transfer(maxPledgeAmount);
    
    pledgers[msg.sender] = true;

    emit pledgedEvent(
      msg.sender
    );
  }


  // TRANSATIONS

  function redeemFunds () public pastDeadline campaignSuccessful isRecipient {
    uint pledgeCount = address(this).balance / maxPledgeAmount;
    rebate = (address(this).balance - targetAmount) / pledgeCount; 
    msg.sender.transfer(targetAmount);
  }
  function redeemRebate () public pastDeadline campaignSuccessful isPledger {
    msg.sender.transfer(rebate);
    pledgers[msg.sender] = false;
  }
  function redeemRefund () public pastDeadline campaignUnsuccessful isPledger {
    msg.sender.transfer(maxPledgeAmount);
    pledgers[msg.sender] = false;
  }

  function redeem () public isRecipient {
    msg.sender.transfer(address(this).balance);
  }
}