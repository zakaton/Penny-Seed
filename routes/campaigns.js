const express = require('express');
    const router = express.Router();

router.get('/', (request, response) => {
    request.contract.getPastEvents("CreatedCampaign", {fromBlock: 0}, (error, createdCampaignEvents) => {
        if(error == null) {
            Promise.all(createdCampaignEvents.map(createdCampaignEvent => new Promise((resolve, reject) => {
                const campaignIndex = Number(createdCampaignEvent.returnValues.campaignIndex);
                const passedDeadline = Date.now() >= Number(createdCampaignEvent.returnValues.deadline);
                const campaign = {events: {}};
                    campaign.events.CreatedCampaign = createdCampaignEvent;

                request.contract.methods.campaigns(campaignIndex).call({}, (error, campaignStruct) => {
                    if(error == null) {
                        campaign.struct = campaignStruct;
                        const campaignSucceeded = Number(campaign.struct.numberOfPledgers) >= Number(campaign.struct.minimumNumberOfPledgers);

                        if(request._user !== undefined) {
                            if(request._user.etherAddress !== undefined) {
                                request.contract.getPastEvents("PledgedToCampaign", {fromBlock: 0, filter: {campaignIndex, pledger: request._user.etherAddress}}, (error, pledgedToCampaignEvents) => {
                                    if(error == null) {
                                        campaign.events.PledgedToCampaign = pledgedToCampaignEvents[0];
                                        if(passedDeadline) {
                                            if(campaignSucceeded) {
                                                request.contract.getPastEvents("RedeemedRebate", {fromBlock: 0, filter: {campaignIndex, pledger: request._user.etherAddress}}, (error, redeemedRebateEvents) => {
                                                    if(error == null) {
                                                        campaign.events.RedeemedRebate = redeemedRebateEvents[0];
                                                        resolve(campaign);
                                                    }
                                                    else {
                                                        console.error(error);
                                                        reject(error);
                                                    }
                                                });
                                            }
                                            else {
                                                request.contract.getPastEvents("RedeemedRefund", {fromBock: 0, filter: {campaignIndex, pledger: request._user.etherAddress}}, (error, redeemedRefundEvents) => {
                                                    if(error == null) {
                                                        campaign.events.RedeemedRefund = redeemedRefundEvents[0];
                                                        resolve(campaign);
                                                    }
                                                    else {
                                                        console.error(error);
                                                        reject(error);
                                                    }
                                                });
                                            }
                                        }
                                        else {
                                            resolve(campaign);
                                        }
                                    }
                                    else {
                                        console.error(error);
                                        reject(error);
                                    }
                                });
                            }
                            else {
                                resolve(campaign);
                            }
                        }
                        else {
                            resolve(campaign);
                        }
                    }
                    else {
                        console.error(error);
                        reject(error);
                    }
                });
            }))).then(campaigns => {
                response.render('campaigns', {
                    user : request.user,
                    _user : request._user,

                    campaigns,
                })
            }).catch(error => {
                console.error(error);
                response.redirect('/');
            });
        }
        else {
            console.error(error);
            response.redirect('/');
        }
    });
});

router.post('/pledge', (request, response) => {
    const {campaignIndex} = request.body;

    request._user.pledgeToCampaign(request.contract, campaignIndex, (error, campaignIndex) => {
        if(error == null) {
            request._user.save(error => {
                if(error) {
                    console.error(error);
                    response.redirect('/');
                }
                else {
                    response.redirect('/');
                }
            });
        }
        else {
            console.error(error);
            response.redirect('/');
        }
    })
});

module.exports = router;