class PennySeedContract {
    static parseCampaign(values) {
        return ["beneficiary",
            "goal",
            "balance",
            "startTime",
            "campaignPeriod",
            "hasClaimed",
            "pledgeAmount",
            "pledgeCount"
        ].reduce((campaignDescription, key, index) => {
            campaignDescription[key] = values[index].toString();
            return campaignDescription;
        }, {});
    }

    deployed() {
        this.web3Provider = (typeof window.web3 !== "undefined") ?
            window.web3.currentProvider :
            new Web3.providers.HttpProvider('http://localhost:7545');
        window.web3 = new Web3(this.web3Provider);

        return fetch("PennySeed.json")
            .then(response => response.json())
            .then(contractJSON => {
                const contract = TruffleContract(contractJSON);
                contract.setProvider(this.web3Provider);

                return contract.deployed()
                    .then(instance => {
                        this.instance = instance;
                        return window.ethereum.enable();
                    });
            });
    }

    getCampaign(campaignIndex) {
        return this.instance.campaigns(campaignIndex)
            .then(values => {
                return new Promise((resolve, reject) => {
                    resolve(this.constructor.parseCampaign(values))
                });
            });
    }
    createCampaign(targetAmount, pledgeAmount, period) {

    }
}

class PennySeedElement extends HTMLElement {
    constructor() {
        super();
        this.contract = new PennySeedContract();

        window.addEventListener("load", event => {
            this.contract.deployed()
                .then(() => {
                    console.log(this, "has loaded");
                });
        });
    }

    static get observedAttributes() {
        return [

        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch(name) {
            default:
                break;
        }
    }
}

if(document.createElement("penny-seed").constructor == HTMLElement)
    customElements.define("penny-seed", PennySeedElement);

if(false) {
    const campaignForm = document.createElement("form");
    const getCampaignArguments = ["Amount", "Pledge Amount", "Campaign Period"].map(campaignArgument => {
        const label = document.createElement("label");
            const title = document.createElement("h3");
                title.innerText = campaignArgument;
            label.appendChild(title);

            const input = document.createElement("input");
                input.type = "number";
                input.value = 1;
                input.min = 1;
            label.appendChild(input);
        campaignForm.appendChild(label);

        return () => input.value;
    });
    const createButton = document.createElement("button");
        createButton.innerText = "Create";
        createButton.addEventListener("click", event => {
            event.preventDefault();
            pennySeedContractInstance.createCampaign(...getCampaignArguments.map(getter => getter()));
        });            
        campaignForm.appendChild(createButton);
    document.body.appendChild(campaignForm);
    document.body.appendChild(document.createElement("hr"));


    // CAMPAIGNS
    const eventsContainer = document.createElement("div");

        eventsContainer.innerHTML += "<h2>Campaigns</h2>";

        const eventsList = document.createElement("ol");
        eventsContainer.appendChild(eventsList);

    document.body.appendChild(eventsContainer);
    document.body.appendChild(document.createElement("hr"));


    // EVENTS
    window.addEventListener("load", event => {
        window.web3Provider = (typeof web3 !== "undefined") ?
            web3.currentProvider :
            new Web3.providers.HttpProvider('http://localhost:7545');
        window.web3 = new Web3(window.web3Provider);

        fetch("PennySeed.json")
            .then(response => response.json())
            .then(pennySeedJSON => {
                const pennySeedContract = TruffleContract(pennySeedJSON);
                pennySeedContract.setProvider(window.web3Provider);

                pennySeedContract.deployed()
                    .then(pennySeedContractInstance => {
                        ethereum.enable()
                            .then(() => {
                                window.pennySeedContractInstance = pennySeedContractInstance;

                                pennySeedContractInstance.CreatedCampaignEvent({}, {
                                    fromBlock : 0,
                                    toBlock : "latest",
                                }).get((error, events) => {
                                    events.forEach((event, eventIndex) => {

                                        // render Campaign
                                        const eventListItem = document.createElement("li");
                                            const eventArguments = document.createElement("ul");
                                            Object.keys(event.args).forEach(key => {
                                                const value = event.args[key];
                                                const listItem = document.createElement("li");
                                                    listItem.dataset.arg = key;
                                                    listItem.innerText = key + ': ' + value;
                                                eventArguments.appendChild(listItem);
                                            });
                                            eventListItem.appendChild(eventArguments);
                                        eventsList.appendChild(eventListItem);

                                        // Update balance
                                        pennySeedContractInstance.PledgedToCampaignEvent({
                                            fromBlock : 0,
                                            toBlock : "latest",

                                            _campaignId : event.args._campaignId,
                                        }).get((error, events) => {
                                            console.log(eventIndex, events);
                                        });


                                        // add a claim or rebate button
                                        pennySeedContractInstance.ReachedGoalEvent({
                                            fromBlock : 0,
                                            toBlock : "latest",

                                            _campaignId : event.args._campaignId,
                                        }).get((error, events) => {
                                            console.log("reached goal", events);
                                        });
                                    });
                                });

                                // Render Events
                                const eventsContainer = document.createElement("div");
                                    eventsContainer.innerHTML += "<h2>Events</h2>";
                                    const _eventsList = document.createElement("ol");

                                    pennySeedContractInstance.allEvents({
                                        fromBlock : 0,
                                        toBlock : "latest",
                                    }).watch((error, event) => {
                                        const listItem = document.createElement("li");
                                        const _eventList = document.createElement("ul");
                                        _eventList.innerHTML += "<li>" + "eventName: " + event.event + "</li>";
                                        Object.keys(event.args).forEach(key => {
                                            const value = event.args[key];
                                            const _listItem = document.createElement("li");
                                                _listItem.dataset.arg = key;
                                                _listItem.innerText = key + ': ' + value;
                                                _eventList.appendChild(_listItem);
                                        });
                                        listItem.appendChild(_eventList);
                                        _eventsList.appendChild(listItem);
                                    });

                                    eventsContainer.appendChild(_eventsList);
                                document.body.appendChild(eventsContainer);
                            });
                    });
            });
    });
}