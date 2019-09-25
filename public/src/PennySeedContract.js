window.addEventListener("load", () => {
    if(typeof web3 !== "undefined") {
        ethereum.enable()
            .then(accounts => {
                fetch('/contract')
                    .then(response => response.json())
                    .then(_contract => {
                        window.pennySeedContract = web3.eth.contract(_contract.jsonInterface).at(_contract.address);
                    });
            });
    }
});