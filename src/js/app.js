App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  campaignInstance : null,

  init: function() {
    const web3Provider = (typeof web3 !== "undefined")?
      web3.currentProvider :
      new Web3.providers.HttpProvider('http://localhost:7545');
    
    web3 = new Web3(web3Provider);

    fetch("PennySeed.json")
      .then(response => response.json())
      .then(pennySeed => {
        App.contracts.pennySeed = TruffleContract(pennySeed);
        App.contracts.pennySeed.setProvider(web3Provider);

        App.contracts.pennySeed.deployed()
          .then(pennySeedInstance => {
            window.pennySeedInstance = pennySeedInstance;

            ethereum.enable()
              .then(() => {
                // do stuff
              })
          })
      })
    
    fetch("Campaign.json")
      .then(response => response.json())
      .then(campaign => {
    
        App.contracts.campaign = TruffleContract(campaign);
        App.contracts.campaign.setProvider(web3Provider);
    
        web3.eth.getCoinbase(function(err, account) {
          if (err === null) {
            App.account = account;
          }
        });
    
        App.contracts.campaign.deployed().then(function(instance) {
          campaignInstance = instance;
          window.campaignInstance = campaignInstance;
    
          ethereum.enable()
            .then(() => {
              campaignInstance.pledgers(web3.eth.accounts[0])
                .then(hasPledged => {
                  if(hasPledged) {

                  }
                  else {
                    campaignInstance.recipient()
                      .then(recipient => {
                        if(recipient !== web3.eth.accounts[0]) {
                          campaignPledge.style.display = '';
                          campaignPledge.addEventListener("click", event => {
                            campaignInstance.pledge({from : web3.eth.accounts[0], value : web3.toWei('0.0065','ether')})
                              .then(() => {
                                campaignPledge.style.display = "none";
                              });
                          });
                        }
                      });
                  }     
                });
              
              campaignAddress.value = campaignInstance.address;
    
              campaignInstance.recipient()
                .then(recipient => campaignRecipient.value = recipient);
  
              campaignInstance.targetAmount()
                .then(target => campaignTarget.value = target);

              campaignInstance.startTime()
                .then(start => {
                  campaignInstance.campaignPeriod()
                    .then(period => {
                      campaignStart.value = start;
                      campaignPeriod.value = period;
                      campaignDeadline.value = start+period;
                    })
                })
              
              campaignInstance.pledgedEvent({}, {
                fromBlock : 0,
                toBlock : "latest",
              }).watch((error, event) => {

                campaignPledgers.innerHTML += "<li>" + event.args._pledger + "</li>"
                
                web3.eth.getBalance(campaignInstance.address, (error, balance) => {
                  campaignCurrentAmount.value = balance.toString();
                });

              });    
            });
        });
      });
  }
};

App.init();