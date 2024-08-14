// Initial Game Variables
let day = 1;
let money = 50.00;
let lemons = 10;
let sugar = 10;
let cups = 10;
let pricePerCup = 1.00;

function updateUI() {
    document.getElementById('day').innerText = day;
    document.getElementById('money').innerText = money.toFixed(2);
    document.getElementById('lemons').innerText = lemons;
    document.getElementById('sugar').innerText = sugar;
    document.getElementById('cups').innerText = cups;
    document.getElementById('price').innerText = pricePerCup.toFixed(2);
}

function buySupplies() {
    const cost = 10; // Simple cost for supplies package
    if (money >= cost) {
        money -= cost;
        lemons += 10;
        sugar += 10;
        cups += 10;
        logEvent("Bought 10 of each supply.");
        updateUI();
    } else {
        logEvent("Not enough money to buy supplies.");
    }
}

function setPrice() {
    const newPrice = prompt("Set a new price per cup:", pricePerCup.toFixed(2));
    if (newPrice !== null && !isNaN(newPrice) && newPrice > 0) {
        pricePerCup = parseFloat(newPrice);
        logEvent(`Set price to $${pricePerCup.toFixed(2)} per cup.`);
        updateUI();
    } else {
        logEvent("Invalid price entered.");
    }
}

function startSelling() {
    if (lemons > 0 && sugar > 0 && cups > 0) {
        let cupsSold = Math.min(lemons, sugar, cups, Math.floor(Math.random() * 20 + 1));
        let revenue = cupsSold * pricePerCup;
        money += revenue;
        lemons -= cupsSold;
        sugar -= cupsSold;
        cups -= cupsSold;
        logEvent(`Sold ${cupsSold} cups for $${revenue.toFixed(2)}.`);
        applyRandomEvent();
        day++;
        
        updateUI();
    } else {
        logEvent("Not enough supplies to sell lemonade.");
    }
}

function logEvent(message) {
    let log = document.getElementById('event-log');
    log.innerHTML = `<p>${message}</p>` + log.innerHTML;
}

function applyRandomEvent() {
    const events = [
        { message: "A heatwave increases demand!", effect: () => { pricePerCup += 0.5; logEvent("Price automatically increased due to high demand!"); } },
        { message: "Sudden rainstorm decreases demand.", effect: () => { pricePerCup -= 0.5; logEvent("Price automatically decreased due to low demand!"); } },
        { message: "A competitor opens a stand nearby.", effect: () => { pricePerCup -= 0.25; logEvent("Competitor forces price drop!"); } },
        { message: "Unexpected rush of customers!", effect: () => { let extraSales = Math.min(lemons, sugar, cups, Math.floor(Math.random() * 10 + 1)); money += extraSales * pricePerCup; lemons -= extraSales; sugar -= extraSales; cups -= extraSales; logEvent(`Sold ${extraSales} extra cups!`); } },
        { message: "New ingredient discovered! Free mint added to lemonade.", effect: () => { logEvent("Mint lemonade increases customer satisfaction! Price stays the same but sales increase."); } },
    ];

    let randomEvent = events[Math.floor(Math.random() * events.length)];
    logEvent(randomEvent.message);
    randomEvent.effect();
}

// Initial UI Update
updateUI();
