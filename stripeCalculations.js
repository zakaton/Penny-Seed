module.exports = {
    floatToDollar(float, roundUp = true) {
        var dollarAmount = float;
            dollarAmount *= 100;
            dollarAmount = roundUp?
                Math.ceil(dollarAmount) :
                Math.floor(dollarAmount);
            dollarAmount /= 100;
            return dollarAmount;
    },
    processingFee(dollarAmount) {
        return this.floatToDollar((amount * 0.029) + 0.30);
    },
    processedAmount(dollarAmount) {
        return this.floatToDollar(dollarAmount - this.processingFee(dollarAmount), false);
    },
    preprocessedPledgeAmount(dollarAmount) {
        return this.floatToDollar((dollarAmount + 0.30) / (1 - 0.029));
    }
}