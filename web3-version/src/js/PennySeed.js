class PennySeed {
    load() {
        this.web3Provider = (typeof window.web3 !== "undefined") ?
            window.web3.currentProvider :
            new Web3.providers.HttpProvider('http://localhost:7545');
        window.web3 = new Web3(this.web3Provider);

        return fetch("PennySeed.json")
            .then(response => response.json())
            .then(contractJSON => {
                this.contract = TruffleContract(contractJSON);
                this.contract.setProvider(this.web3Provider);

                return this.contract.deployed()
                    .then(instance => {
                        this.contract.instance = instance;
                        return window.ethereum.enable();
                    });
            });
    }
}

class PennySeedElement extends HTMLElement {
    constructor() {
        super();
        this.pennySeed = new PennySeed();
        this.isLoaded = false;

        this.attachShadow({mode : "open"});

        window.addEventListener("load", event => {
            this.load()
                .then(() => {
                    this.isLoaded = true;
                    this.attributeChangedCallback("type", null, this.getAttribute("type"));
                    console.log(this, "has loaded");
                    this.pennySeed.contract.instance.allEvents({fromBlock: 0, toBlock: "latest"})
                        .watch((error, event) => {
                            if(error == null) {
                                const eventName = "on" + event.event.replace("Event", '');
                                const customEvent = new CustomEvent(eventName.toLowerCase(), {
                                    detail : event
                                });

                                this.dispatchEvent(customEvent);
                            }
                        });
                });
        });
    }

    load() {
        return this.pennySeed.load();
    }

    static get observedAttributes() {
        return [
            "type",
            "campaign-index",

            // Event Listeners
            "oncreatedcampaign",
            "onpledgedtocampaign",
            "onreachedgoal",
            "onclaimedfunds",
            "onredeemedrebate",
            "onredeemedrefund",
            "ondeadlinehaspassed",
        ];
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
        switch(attribute) {
            case "type":
                switch(newValue) {
                    case "create":
                        this.renderCreateCampaign();
                        break;
                    case "pledge":
                        this.renderPledgeToCampaignForm();
                        break;
                    default:
                        break;
                }
                break;

            case "campaign-index":
                // check if the campaign exists
                this.renderPledgeToCampaignForm();
                break;
            default: // EventListeners
                this.addEventListener(attribute, event => {
                    const eventCampaignIndex = event.detail.args._campaignIndex.toString();
                    const campaignIndex = this.getAttribute("campaign-index");

                    if(campaignIndex == null || eventCampaignIndex == campaignIndex)
                        eval(newValue);
                });
                break;
        }
    }

    get createCampaignForm() {
        return `
            <form>
                <h1>Create a Campaign</h1>

                <label>
                    <p>Amount (wei)</p>
                    <input id="goal" type="number" value=1000 step=0.01>
                </label>

                <br>

                <label>
                    <p>Pledge Amount (wei)</p>
                    <input id="pledgeAmount" type="number" value=1 step=0.01>
                </label>

                <br>

                <label>
                    <p>Deadline</p>
                    <input id="deadline" type="datetime-local">
                </label>

                <br>
                <br>

                <input id="createButton" type="button" value="Create">
            </form>
        `;
    }

    renderCreateCampaign() {
        // too lazy to set the date default value & min value to "now"

        this.shadowRoot.innerHTML = this.createCampaignForm;
        this.shadowRoot.getElementById("createButton").addEventListener("click", event => {
            const deadlineDate = new Date(this.shadowRoot.getElementById("deadline").value);

            const goal = Number(this.shadowRoot.getElementById("goal").value); // in ether
            const pledgeAmount = Number(this.shadowRoot.getElementById("pledgeAmount").value); // in ether
            const period = Math.floor((deadlineDate.getTime() - Date.now()) /1000); // in seconds

            if(goal > 0 && Number.isInteger(goal)) {
                if(pledgeAmount > 0 && pledgeAmount <= goal && Number.isInteger(pledgeAmount)) {
                    if(period > 0 && Number.isInteger(period)) {
                        this.pennySeed.contract.instance.createCampaign(goal.toString(), pledgeAmount.toString(), period.toString())
                            .then(transaction => {                
                                const campaignIndex = Number(transaction.logs.find(event => event.event == "CreatedCampaignEvent").args._campaignIndex.toString());
                                this.setAttribute("campaign-index", campaignIndex);
                                this.setAttribute("type", "pledge");

                                if(Notification.permission == "granted")
                                    new Notification("Penny Seed", {
                                        body : "You've created a Campaign (#" + campaignIndex + ')',
                                        icon : "./images/penny.jpg"
                                    });
                            });
                    }
                    else throw "deadline must be a valid time after today";
                }
                else throw "pledge amount must be an Integer between 0 and " + goal;
            }
            else throw "goal must be a positive integer";
        });
    }

    get pledgeToCampaignForm() {
        // I'll just fill in values from the Campaign struct from the contract for now
        return `
            <form>
                <h1>Campaign #<span id="campaignIndex"></span></h1>

                <p>Beneficiary: <span id="beneficiary"></span></p>

                <p>Goal (wei): <span id="goal"></span></p>

                <p>Balance (wei): <span id="balance"></span></p>

                <p>Starting Time (seconds): <span id="startTime"></span></p>

                <p>Campaign Period (seconds): <span id="campaignPeriod"></span></p>

                <p>Has Claimed: <span id="hasClaimed"></span></p>

                <p>Pledge Amount (wei): <span id="pledgeAmount"></span></p>

                <p>Number of Pledgers: <span id="numberOfPledgers"></span></p>

                <p>Redeem Amount (wei): <span id="redeemAmount"></></p>

                <p>Goal has been Reached: <span id="goalHasBeenReached"></span></p>

                <input id="button" type="button">
            </form>
        `;
    }

    renderPledgeToCampaignForm() {
        this.shadowRoot.innerHTML = this.pledgeToCampaignForm;
        const campaignIndex = this.getAttribute("campaign-index");

        if(this.isLoaded)
            this.pennySeed.contract.instance.campaigns(campaignIndex)
                .then(rawValues => {
                    this.shadowRoot.getElementById("campaignIndex").innerText = campaignIndex;
                    
                    const campaignDescription = {};
                    const campaignDescriptors = [
                        "beneficiary",

                        "goal",
                        "balance",

                        "startTime",
                        "campaignPeriod",
                        
                        "hasClaimed",
                        
                        "pledgeAmount",
                        "numberOfPledgers",
                        "redeemAmount",

                        "goalHasBeenReached",
                    ].forEach((descriptor, index) => {
                        const value = rawValues[index].toString();
                        campaignDescription[descriptor] = value;

                        this.shadowRoot.getElementById(descriptor).innerText = value;
                    });

                    const flags = {
                        isBeneficiary : web3.eth.accounts[0] == campaignDescription.beneficiary,
                        
                        reachedGoal : false,
                        deadlineHasPassed : false,
                        hasClaimed : false,
                        
                        hasPledged : false,
                        hasRedeemed : false,
                    }

                    this.pennySeed.contract.instance.allEvents({fromBlock : 0, toBlock : "latest"})
                        .get((error, results) => {
                            results.forEach(event => {

                                if(event.args._campaignIndex.toString() == campaignIndex) {
                                    switch(event.event) {
                                        case "DeadlineHasPassedEvent":
                                            flags.deadlineHasPassed = true;
                                            break;
                                        case "ClaimedFundsEvent":
                                            flags.hasClaimed = true;
                                            break;
                                        case "PledgedToCampaignEvent":
                                            if(web3.eth.accounts.includes(event.args._pledger))
                                                flags.hasPledged = true;
                                            break;
                                        case "RedeemedRebateEvent":
                                            if(web3.eth.accounts.includes(event.args._pledger))
                                                flags.hasRedeemed = true;
                                            break;
                                        case "RedeemedRefundEvent":
                                            if(web3.eth.accounts.includes(event.args._pledger))
                                                flags.hasRedeemed = true;
                                            break;
                                        case "ReachedGoalEvent":
                                            flags.reachedGoal = true;
                                            break;
                                        default:
                                            break;
                                    }
                                }
                            });

                            const button = this.shadowRoot.getElementById("button");

                            if(flags.isBeneficiary) {
                                if(flags.reachedGoal) {
                                    if(flags.hasClaimed) {
                                        button.value = "You've already claimed";
                                        button.disabled = true;
                                    }
                                    else {
                                        // Claim Funds
                                        button.value = "Claim";
                                        button.addEventListener("click", event => {
                                            this.pennySeed.contract.instance.claimFunds(campaignIndex)
                                                .then(() => {
                                                    this.renderPledgeToCampaignForm();
                                                    if(Notification.permission == "granted")
                                                        new Notification("Penny Seed", {
                                                            body : "You've claimed your Funding!",
                                                            icon : "./images/penny.jpg"
                                                        });
                                                });
                                        });
                                    }
                                }
                                else {
                                    if(flags.deadlineHasPassed) {
                                        button.value = "Failed Campaign";
                                        button.disabled = true;
                                    }
                                    else {
                                        button.value = "You haven't reached your goal yet";
                                        button.disabled = true;
                                    }
                                }
                            }
                            else {
                                if(flags.hasPledged) {
                                    if(flags.reachedGoal) {
                                        if(flags.hasRedeemed) {
                                            button.value = "You've already redeemed your rebate";
                                            button.disabled = true;
                                        }
                                        else {
                                            if(flags.deadlineHasPassed) {
                                                // Redeem Rebate
                                                button.value = "Redeem Rebate";
                                                button.addEventListener("click", event => {
                                                    this.pennySeed.contract.instance.redeemRebate(campaignIndex)
                                                        .then(transaction => {
                                                            this.renderPledgeToCampaignForm();
                                                            console.log(transaction)
                                                            if(Notification.permission == "granted")
                                                                new Notification("Penny Seed", {
                                                                    body : "You've redeemed your Rebate!",
                                                                    icon : "./images/penny.jpg"
                                                                });
                                                        });
                                                });    
                                            }
                                            else {
                                                button.value = "You can redeem your rebate after the deadline";
                                                button.disabled = true;
                                            }
                                        }
                                    }
                                    else {
                                        if(flags.deadlineHasPassed) {
                                            if(flags.hasRedeemed) {
                                                // Redeem Refund
                                                button.value = "Redeem Refund";
                                                button.addEventListener("click", event => {
                                                    this.pennySeed.contract.instance.redeemRefund(campaignIndex)
                                                        .then(() => {
                                                            this.renderPledgeToCampaignForm();
                                                            if(Notification.permission == "granted")
                                                                new Notification("Penny Seed", {
                                                                    body : "You've redeemed your Refund!",
                                                                    icon : "./images/penny.jpg"
                                                                });
                                                        });
                                                });
                                            }
                                            else {
                                                button.value = "You've already redeemed your Refund";
                                                button.disabled = true;    
                                            }
                                            
                                        }
                                        else {
                                            button.value = "You've already pledged";
                                            button.disabled = true;
                                        }
                                    }
                                }
                                else {
                                    if(flags.deadlineHasPassed) {
                                        button.value = "Campaign is Over";
                                        button.disabled = true;
                                    }
                                    else {
                                        // Pledge
                                        button.value = "Pledge";
                                        button.addEventListener("click", event => {
                                            this.pennySeed.contract.instance.pledgeToCampaign(campaignIndex, {from : web3.eth.accounts[0], value : campaignDescription.pledgeAmount})
                                                .then(transaction => {
                                                    this.renderPledgeToCampaignForm();
                                                    if(Notification.permission == "granted") {
                                                        new Notification("Penny Seed", {
                                                            body : "You've pledged to Campaign #" + campaignIndex,
                                                            icon : "./images/penny.jpg"
                                                        });
                                                        if(transaction.logs.find(event => event.event == "ReachedGoalEvent"))
                                                            new Notification("Penny Seed", {
                                                                body : "Campaign #" + campaignIndex + " has reached its funding goal!",
                                                                icon : "./images/celebrate.png"
                                                            });
                                                    }
                                                });
                                        });    
                                    }
                                }
                            }

                            if(button.value == '')
                                button.style.display = "none"; 
                    });
                });
    }
}

if(document.createElement("penny-seed").constructor == HTMLElement)
    customElements.define("penny-seed", PennySeedElement);