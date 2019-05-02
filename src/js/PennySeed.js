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

        window.addEventListener("load", event => {
            this.load()
                .then(() => {
                    console.log(this, "has loaded");
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
        ];
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
        switch(attribute) {
            case "type":
                switch(newValue) {
                    case "create":
                        this.innerHTML = this.createCampaignForm;
                        break;
                    case "pledge":
                        this.innerHTML = this.pledgeToCampaignForm;
                        break;
                    default:
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

    get createCampaignForm() {
        return `
            <form>
                <h1>Create a Campaign</h1>

                <label>
                    <p>Amount</p>
                    $<input type="number" value=1000 step=0.01>
                </label>

                <br>

                <label>
                    <p>Deadline</p>
                    <input type="datetime-local">
                </label>

                <br>

                <label>
                    <p>Maximum Pledge</p>
                    $<input type="number" value=1 step=0.01>
                </label>

                <br>

                <label>
                    <p>Minimum Pledgers</p>
                    <input type="number" value=1000 step=1>
                </label>

                <br>

                <input type="button" value="Create">
            </form>
        `;
    }

    get pledgeToCampaignForm() {
        return `
            <form>
                <h1>Campaign #1</h1>

                <p>Amount: $1000</p>

                <br>

                <p>Started: 4/16/2019 00:00 AM</p>

                <br>

                <p>Deadline: 4/17/2019 00:00 AM</p>

                <br>

                <p>Maximum Pledge: $1</p>

                <br>

                <p>Pledgers: 0/1000</p>

                <br>

                <input type="button" value="Pledge">
            </form>
        `;
    }
}

if(document.createElement("penny-seed").constructor == HTMLElement)
    customElements.define("penny-seed", PennySeedElement);