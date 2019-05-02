class PennySeed {
    deployed() {
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

        window.addEventListener("load", event => {
            this.deployed()
                .then(() => {
                    console.log(this, "has loaded");
                });
        });
    }

    deployed() {
        return this.pennySeed.deployed();
    }

    static get observedAttributes() {
        return [
            "type",
            "campaign-index",
        ];
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
        switch(attribute) {
            case "type":
                switch(newValue) {
                    case "create":
                        // display a "create a campaign" form
                        break;
                    case "pledge":
                        // display a "pledge to campaign" form
                        break;
                    default:
                        // display nothing (use to just inteface with the contract)
                        break;
                }
                break;
            case "campaign-index":
                // check if the index is valid
                // check if the campaign has completed or not
                // check if the user is the beneficiary
                // check if the user has pledged or not
                break;
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

                                            campaignIndex : event.args.campaignIndex,
                                        }).get((error, events) => {
                                            console.log(eventIndex, events);
                                        });


                                        // add a claim or rebate button
                                        pennySeedContractInstance.ReachedGoalEvent({
                                            fromBlock : 0,
                                            toBlock : "latest",

                                            campaignIndex : event.args.campaignIndex,
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