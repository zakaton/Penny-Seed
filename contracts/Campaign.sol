pragma solidity ^0.5.0;

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
}