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