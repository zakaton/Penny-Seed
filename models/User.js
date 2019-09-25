const mongoose = require('mongoose');

const Web3 = require('web3');
    const web3 = new Web3(process.env.WEB3_PROVIDER);

const userSchema = new mongoose.Schema({
    id : String,

    customerId : String,
    connectId : String,
    etherAddress : {
        type : String,
        get : function(etherAddress) {
            return (etherAddress !== undefined)?
                web3.utils.toChecksumAddress(etherAddress) :
                undefined;
        },
        set : function(etherAddress) {
            return web3.utils.toChecksumAddress(etherAddress);
        }
    },

    pledges : [Number], // this only contains stripe-related pledges
    
    // email?
    // canPledge
    // canCreateCampaign

}, {
    toObject : {virtuals: true},
    toJSON: {virtuals: true},
});

userSchema.methods.getCreatedCampaigns = function(contract, callback) {
    if(this.etherAddress !== undefined) {
        contract.getPastEvents("CreatedCampaign", {fromBlock: 0, filter: {campaigner: this.etherAddress}}, (error, createdCampaignEvents) => {
            if(error == null) {
                Promise.all(createdCampaignEvents.map(createdCampaignEvent => new Promise((resolve, reject) => {
                    const campaignIndex = createdCampaignEvent.returnValues.campaignIndex;
                    contract.methods.campaigns(campaignIndex).call({}, (error, campaignStruct) => {
                        if(error == null) {
                            resolve({
                                struct : campaignStruct,
                                events : {
                                    CreatedCampaign : createdCampaignEvent
                                }
                            });
                        }
                        else {
                            reject(error);
                        }
                    });
                }))).then(campaigns => {
                    callback(null, campaigns);
                }).catch(error => {
                    callback(error, null);
                });
            }
            else {
                callback(error, null);
            }
        });
    }
    else {
        callback(null, []);
    }
};

userSchema.methods.getPledgedCampaigns = function(contract, callback) {
    new Promise((resolve, reject) => {
        if(this.etherAddress !== undefined) {
            contract.getPastEvents("PledgedToCampaign", {fromBlock: 0, filter: {pledger: this.etherAddress}}, (error, pledgedToCampaignEvents) => {
                if(error == null) {
                    resolve(pledgedToCampaignEvents);
                }
                else {
                    console.error(error);
                    reject(error);
                }
            });
        }
        else {
            resolve([]);
        }
    }).then(pledgedToCampaignEvents => {
        const campaignIndices = [...this.pledges, ...pledgedToCampaignEvents.map(pledgedToCampaignEvent => Number(pledgedToCampaignEvent.returnValues.campaignIndex))]

        Promise.all(campaignIndices.map(campaignIndex => new Promise((resolve, reject) => {
            const campaign = {events : {}};
            const paidViaStripe = this.pledges.includes(campaignIndex);
            
            if(!paidViaStripe)
                campaign.events.PledgedToCampaign = pledgedToCampaignEvents.find(pledgedToCampaignEvent => pledgedToCampaignEvent.returnValues.campaignIndex == campaignIndex);
            
            contract.methods.campaigns(campaignIndex).call({}, (error, campaignStruct) => {
                if(error == null) {
                    campaign.struct = campaignStruct;
                    const campaignSucceded = Number(campaignStruct.numberOfPledgers) >= Number(campaignStruct.minimumNumberOfPledgers);
                    
                    contract.getPastEvents("CreatedCampaign", {fromBlock: 0, filter: {campaignIndex}}, (error, createdCampaignEvents) => {
                        if(error == null) {
                            const createdCampaignEvent = createdCampaignEvents[0];
                            campaign.events.CreatedCampaign = createdCampaignEvent;

                            const deadlineHasPassed = Date.now() >= Number(createdCampaignEvent.returnValues.deadline);
                            if(paidViaStripe) {
                                resolve(campaign);
                            }
                            else {
                                if(deadlineHasPassed) {
                                    if(campaignSucceded) {
                                        contract.getPastEvents("RedeemedRebate", {fromBlock: 0, filter: {campaignIndex, pledger: this.etherAddress}}, (error, redeemedRebateEvents) => {
                                            if(error == null) {
                                                if(redeemedRebateEvents.length > 0) {
                                                    const redeemedRebateEvent = redeemedRebateEvents[0];
                                                    campaign.events.RedeemedRebate = redeemedRebateEvent;
                                                    resolve(campaign);
                                                }
                                                else {
                                                    resolve(campaign);
                                                }
                                            }
                                            else {
                                                reject(error);
                                            }
                                        });
                                    }
                                    else {
                                        contract.getPastEvents("RedeemedRefund", {fromBlock: 0, filter: {campaignIndex, pledger: this.etherAddress}}, (error, redeemedRefundEvents) => {
                                            if(error == null) {
                                                if(redeemedRefundEvents.length > 0) {
                                                    const redeemedRefundEvent = redeemedRefundEvents[0];
                                                    campaign.events.RedeemedRefund = redeemedRefundEvent;
                                                    resolve(campaign);
                                                }
                                                else {
                                                    resolve(campaign);
                                                }
                                            }
                                            else {
                                                reject(error);
                                            }
                                        });
                                    }
                                }
                                else {
                                    resolve(campaign);
                                }
                            }
                        }
                        else {
                            reject(error);
                        }
                    });
                }
                else {
                    reject(error);
                }
            });
        }))).then(campaigns => {
            callback(null, campaigns);
        }).catch(error => {
            callback(error, null);
        });
    }).catch(error => {
        callback(error, null);
    });
};

userSchema.methods.pledgeToCampaign = function(contract, campaignIndex, callback) {
    new Promise((resolve, reject) => {
        if(!this.pledges.includes(campaignIndex) && this.customerId !== undefined) {
            if(this.etherAddress !== undefined) {
                contract.getPastEvents("PledgedToCampaign", {fromBlock: 0, filter: {campaignIndex, pledger: this.etherAddress}}, (error, PledgedToCampaignEvents) => {
                    if(error == null) {
                        if(PledgedToCampaignEvents.length == 0) {
                            resolve(campaignIndex);
                        }
                        else {
                            reject("Already Pledged via MetaMask");
                        }
                    }
                    else {
                        reject(error);
                    }
                });
            }
            else {
                resolve(campaignIndex);
            }
        }
        else {
            reject("already pledged", null);
        }
    }).then(campaignIndex => {
        this.pledges.push(campaignIndex);
        web3.eth.getAccounts(function (error, accounts) {
            if(error == null) {
                contract.methods.addExternalPledger(campaignIndex).send({from : accounts[0]}, (error, result) => {
                    if(error == null) {
                        callback(null, campaignIndex);
                    }
                    else {
                        callback(error, null);
                    }
                });
            }
            else {
                console.error(error);
                callback(error, null);
            }
        });
    })
    .catch(error => callback(error, null));
}

const User = mongoose.model('User', userSchema);

module.exports = User;