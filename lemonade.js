var WEATHER_TO_ROW = {'cloudy': 0, 'hazy': 1, 'overcast': 2, 'rain': 3, 'sunny': 4};
var BUY_SPOT_POSITIONS = [173, /*198,*/ 223, /*248,*/ 273, 298, /*323,*/ 348, /*373,*/ 398];


var buySpots = [0, 0, 0, 0, 0, 0];


function Customer(simulation) {
    this.simulation = simulation;
    this.direction = random.sign();
    this.x = this.direction === 1 ? -52 : 623;
    this.y = 160;
    this.bought = false;
    this.buyPosition = -1;
    this.skin = random.integer(0, 6);
    this.frame = 0;
    this.state = 'walking';
    this.wait = 0;
    this.bubble = -1;
    this.bubbleTime = 0;

    this.atlasY = WEATHER_TO_ROW[state.data.weather] * 256;
    this.atlasX = this.skin * 360;

    this._image = this.simulation.images['images/people.png'];
    this._bubbles = this.simulation.images['images/bubbles.png'];
}

Customer.prototype.addBubble = function(bubble) {
    this.bubble = bubble;
    this.bubbleTime = random.integer(10, 20);
};

Customer.prototype.step = function() {
    if (this.state === 'walking') {
        this.x += this.direction * 25;
        this.frame += 1;
        this.frame %= 2;

        if (!this.bought) {
            this.buyPosition = BUY_SPOT_POSITIONS.indexOf(this.x);
            if (this.buyPosition !== -1 && buySpots[this.buyPosition] === 0 && Math.random() < this.simulation.buyOrPass() && this.simulation.buyGlass(this)) {
                this.bought = true;
                this.state = 'drinking';
                this.wait = random.integer(10, 20);
                buySpots[this.buyPosition] += 1;
            }
        }
    } else if (this.state === 'drinking') {
        this.frame = 2;
        this.wait -= 1;
        if (this.wait === 0) {
            this.state = 'walking';
            buySpots[this.buyPosition] -= 1;
        }
    }

    if (this.bubbleTime > 0)
        this.bubbleTime -= 1;

    this.simulation.context.save();
    this.simulation.context.translate(this.x, this.y);
    this.simulation.context.scale(this.direction, 1);
    this.simulation.context.drawImage(
        this._image,
        this.atlasX + this.frame*120, this.atlasY,
        120, 256,
        -60, 0,
        120, 256
    );
    this.simulation.context.restore();

    if (this.bubble !== -1 && this.bubbleTime > 0)
        this.simulation.context.drawImage(
            this._bubbles,
            this.bubble * 98, 0,
            98, 76,
            this.x - 49, this.y - 86,
            98, 76
        );

    if ((this.direction === -1 && this.x <= -60)
        || (this.direction === 1 && this.x >= 572 + 60))
        return false;
    return true;
};

Customer.reset = function() {
    for (var i = 0; i < buySpots.length; i++)
        buySpots[i] = 0;
};


module.exports = Customer;

},{"./random":7,"./state":9}],3:[function(require,module,exports){
'use strict';


function get(days) {
    try {
        var score = localStorage.getItem('LEMONADE_STAND_SCORE_' + days);
        return score != null ? (parseInt(score, 10) || 0) : 0;
    } catch (err) {
        return 0;
    }
}


function set(days, score) {
    try {
        localStorage.setItem('LEMONADE_STAND_SCORE_' + days, score);
        return true;
    } catch (err) {
        return false;
    }
}


module.exports = {
    'get': get,
    'set': set
};

},{}],4:[function(require,module,exports){
'use strict';


var queue = null, loadedCount = 0, totalCount = 0, callback = null;


function load(images, _callback) {
    queue = {};
    totalCount = images.length;
    loadedCount = 0;
    callback = _callback;

    for (var i = 0; i < images.length; i++) {
        var image = new Image();
        image.onload = imageLoaded;
        image.src = images[i];
        queue[images[i]] = image;
    }
}


function imageLoaded() {
    loadedCount += 1;
    if (loadedCount === totalCount)
        callback(queue);
}


module.exports = {
    'load': load
};

},{}],5:[function(require,module,exports){
'use strict';


var polyfills = require('./polyfills');
var state = require('./state');
var loader = require('./loader');
var simulation = require('./simulation');
var highscore = require('./highscore');
var Howl = require('howler').Howl;


var canvas = document.querySelector('section.simulation canvas');
var context = canvas.getContext('2d');
var clockElement = document.querySelector('section.simulation .time span');


var clickSound = new Howl({'src': ['audio/click.mp3']});


loader.load([
    'images/bubbles.png',
    'images/people.png',
    'images/sold_out.png',
    'images/scene/cloudy.png',
    'images/scene/hazy.png',
    'images/scene/overcast.png',
    'images/scene/rain.png',
    'images/scene/sunny.png'
], function(images) {
    simulation.images = images;
    simulation.context = context;
});


function updateClock(progress) {
    var mm = progress * 480;
    var hr = Math.floor(mm/60 + 9);
    var ap = hr <= 11 ? 'a.m.' : 'p.m.';
    mm = Math.floor(mm % 60);
    clockElement.textContent = (hr > 12 ? hr - 12 : hr) + ':' + (mm < 10 ? '0' + mm : mm) + ' ' + ap;
}


simulation.onStep = function(simulation) {
    updateClock(simulation.time / simulation.duration);
    updateCurrentScreen({'inPitcher': simulation.inPitcher});
};


simulation.onStop = function(simulation) {
    var avgSales = (5 - simulation.weatherIndex + ((state.data.temperatureFarenheit - 50) / 10)) / 20 + 0.1;
    var oursales = simulation.totalSold / simulation.totalCustomers;
    var salesPitch = 'GREAT!';
    if (oursales < avgSales * 1.25)
        salesPitch = 'Good.';
    if (oursales < avgSales)
        salesPitch = 'Average.';
    if (oursales < avgSales * 0.75)
        salesPitch = 'Pitiful!';

    var screen = showScreen('screen-day', {
        'totalSold': simulation.totalSold,
        'totalCustomers': simulation.totalCustomers,
        'pitch': salesPitch
    });

    var satisfaction = 50;
    if (state.data.repLevel > 0) {
        satisfaction = Math.floor((state.data.reputation / state.data.repLevel) * 50);
        satisfaction = Math.min(Math.max(satisfaction, 0), 100);
    }
    screen.element.querySelector('.progress-bar.satisfaction .bar').style.width = satisfaction + '%';
    screen.element.querySelector('.progress-bar.satisfaction .value').textContent = satisfaction + '%';

    var popularity = Math.min(Math.floor(state.data.repLevel / 10), 100);
    screen.element.querySelector('.progress-bar.popularity .bar').style.width = popularity + '%';
    screen.element.querySelector('.progress-bar.popularity .value').textContent = popularity + '%';
};


function find(selector, callback) {
    var elements = document.querySelectorAll(selector);
    if (callback)
        for (var i = 0; i < elements.length; i++)
            callback(elements[i]);
    return elements;
}


function findIn(parent, selector, callback) {
    var elements = parent.querySelectorAll(selector);
    if (callback)
        for (var i = 0; i < elements.length; i++)
            callback(elements[i]);
    return elements;
}


function button(selector, callback) {
    var buttons = document.querySelectorAll(selector);
    for (var i = 0; i < buttons.length; i++)
        buttons[i].addEventListener('click', callback);
    return buttons;
}

function disableButton(button) {
    button.disabled = true;
}

function enableButton(button) {
    button.disabled = false;
}


document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});


function getScreenTitle(screen) {
    var heading = screen.querySelector('h1,h2');
    if (heading)
        return heading.textContent;
    var title = screen.id.replace('screen-', '').replace(/-/g, '');
    return title[0].toUpperCase() + title.slice(1);
}

function getScreens() {
    var screens = {};
    var sections = find('body>section[id]');
    for (var i = 0; i < sections.length; i++) {
        var element = sections[i];
        screens[element.id] = {
            'element': element,
            'id': element.id,
            'title': getScreenTitle(element),
            'showClass': element.dataset.show,
            'hideClass': element.dataset.hide
        };
    }
    return screens;
}


function updateStateValueForElement(element) {
    if ('value' in element) {
        element.value = state.data[element.dataset.value];
    } else {
        if (element.dataset.value in state.display)
            element.textContent = state.display[element.dataset.value]();
        else
            element.textContent = state.data[element.dataset.value];
    }
}


function updateStateValues(container, context) {
    var elements = container.querySelectorAll('[data-value]');
    for (var i = 0; i < elements.length; i++)
        updateStateValueForElement(elements[i]);

    if (state.data) {
        elements = document.querySelectorAll('[data-can-afford]');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (state.data.money < state.data[element.dataset.canAfford]) {
                element.classList.add('hidden');
                findIn(element, 'button', disableButton);
            } else {
                element.classList.remove('hidden');
                findIn(element, 'button', enableButton);
            }
        }
    }

    if (context) {
        elements = document.querySelectorAll('[data-context]');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.dataset.context in context)
                element.textContent = context[element.dataset.context];
            else
                element.textContent = '';
        }
    }
}

function updateCurrentScreen(context) {
    updateStateValues(screens[currentScreen].element, context);
}


var screens = getScreens();
var currentScreen = null;


function showScreen(id, context) {
    var screen;

    if (currentScreen) {
        screen = screens[currentScreen];
        screen.element.classList.add('hidden');
    }

    currentScreen = id;
    screen = screens[id];
    updateCurrentScreen(context);
    screen.element.classList.remove('hidden');
    return screen;
}


function validateNumber() {
    if (parseFloat(this.value) > parseFloat(this.max))
        this.value = this.max;
    else if (parseFloat(this.value) < parseFloat(this.min))
        this.value = this.min;
    else if (this.validity && this.validity.badInput)
        this.value = this.min;

    state.data[this.dataset.value] = parseInt(this.value, 10);
}

function minNumber() {
    if (this.validity && !this.validity.valid)
        this.value = this.min;
}

find('input[type="number"]', function(input) {
    input.addEventListener('input', validateNumber);
    input.addEventListener('blur', minNumber);
});

function increaseNumber() {
    var field = document.getElementById(this.dataset.increase);
    field.value = Math.min(parseFloat(field.max), parseFloat(field.value) + parseFloat(field.step));
    state.data[field.dataset.value] = parseInt(field.value, 10);
}

find('button[data-increase]', function(button) {
    button.addEventListener('click', increaseNumber);
});

function decreaseNumber() {
    var field = document.getElementById(this.dataset.decrease);
    field.value = Math.max(parseFloat(field.min), parseFloat(field.value) - parseFloat(field.step));
    state.data[field.dataset.value] = parseInt(field.value, 10);
}

find('button[data-decrease]', function(button) {
    button.addEventListener('click', decreaseNumber);
});


find('button[data-screen]', function(button) {
    button.addEventListener('click', showScreen.bind(button, button.dataset.screen));
});


var simulationElement = document.querySelector('section.simulation>div');
var simulationElementScale = 1;

function resize() {
    simulationElementScale = Math.min(window.innerWidth / 600, window.innerHeight / 460);
    simulationElement.style.transform = 'scale(' + simulationElementScale + ', ' + simulationElementScale + ')';

    var otherSectionsScale = 1;
    if (window.innerWidth > 580 || window.innerHeight > 500)
        otherSectionsScale = Math.max(1, Math.min(window.innerWidth / 580, window.innerHeight / 500));

    for (var id in screens)
        if (id !== 'screen-simulation') {
            screens[id].element.style.transform = 'translate(-50%, -50%) scale(' + otherSectionsScale + ', ' + otherSectionsScale + ')';
            if (otherSectionsScale > 1) {
                if (window.innerWidth < window.innerHeight)
                    screens[id].element.classList.add('upscale-portrait');
                else
                    screens[id].element.classList.add('upscale-landscape');
            } else {
                screens[id].element.classList.remove('upscale-portrait');
                screens[id].element.classList.remove('upscale-landscape');
            }
        }
}

window.addEventListener('resize', resize);
resize();


window.addEventListener('load', function() {

    setTimeout(function() {

        showScreen('screen-intro');

    }, 250);

});


function preventDefault(event) {
    event.preventDefault();
}

find('section form', function(form) {
    form.addEventListener('submit', preventDefault);
});


button('button[data-duration]', function() {
    state.create(parseInt(this.dataset.duration, 10));
    showScreen('screen-inventory');
});


button('button[data-buy]', function() {
    var options = this.dataset.buy.split(',');
    var quantity = parseInt(options[0], 10);
    var items = options[1];
    var price = state.data[options[2]];

    if (price > state.data.money)
        return;

    state.data[items] += quantity;
    state.data.money -= price;
    state.data.totalExpenses += price;

    updateCurrentScreen();
});


button('button.start-day', function() {
    simulation.start();

    document.querySelector('.slider button').style.left = ((state.data.price - 1) / 98 * 178) + 'px';

    showScreen('screen-simulation');
});


button('button.speed', function() {
    this.classList.toggle('fast');
    if (this.classList.contains('fast'))
        simulation.frameRate = Infinity;
    else
        simulation.frameRate = 4;
});


button('button.losses', function() {
    state.data.ice = 0;

    var lostLemons = 0;
    if (Math.random() < 0.25) {
        lostLemons = Math.floor(Math.random() * state.data.lemons * 0.5);
        state.data.lemons -= lostLemons;
    }

    var lostSugar = false;
    if (state.data.sugar && Math.random() < 0.05) {
        state.data.sugar = 0;
        lostSugar = true;
    }

    var screen = showScreen('screen-losses', {'lostLemons': lostLemons});
    screen.element.querySelector('.losses-lemons').style.display = lostLemons ? 'block' : 'none';
    screen.element.querySelector('.losses-sugar').style.display = lostSugar ? 'block' : 'none';

    cmgAdBreakCall();
});


function showSeasonReport() {
    var inventoryValue = state.data.cups*2 + state.data.lemons*4 + state.data.sugar*6;
    var outcome = inventoryValue + state.data.totalIncome - state.data.totalExpenses;
    var result;

    var outcomeElement = screens['screen-season'].element.querySelector('[data-context="outcome"]');
    if (outcome < 0) {
        outcomeElement.className = 'red';
        result = 'Too Bad!';
    } else if (outcome > 0) {
        outcomeElement.className = 'green';
        result = 'Congratulations!';
    } else {
        outcomeElement.className = '';
        result = null;
    }

    var previousHighscore = highscore.get(state.data.duration);
    if (outcome > previousHighscore)
        highscore.set(state.data.duration, outcome);

    var screen = showScreen('screen-season', {
        'inventoryValue': state.money(inventoryValue),
        'outcome': state.money(outcome),
        'previousHighscore': state.money(previousHighscore),
        'result': result
    });

    screen.element.querySelector('.previous-highscore').style.visibility = previousHighscore > 0 ? 'visible' : 'collapse';
    screen.element.querySelector('.new-highscore').style.display = outcome > previousHighscore ? 'block' : 'none';

    find('.progress-bar .bar', function(bar) {
        bar.style.width = '0';
    });
}


button('button.next-day', function() {
    if (state.data.day === state.data.duration)
        showSeasonReport();
    else {
        state.newDay();
        showScreen('screen-inventory');
    }
});


button('button.season-report', function() {
    showSeasonReport();
});


find('section.simulation .slider', function(slider) {
    var handle = slider.querySelector('button');
    var price = document.querySelector('section.simulation [data-value="price"]');
    var dragStartX;

    function mousedown(event) {
        if (event.touches)
            dragStartX = event.touches[0].clientX - handle.offsetLeft*simulationElementScale;
        else
            dragStartX = event.clientX - handle.offsetLeft*simulationElementScale;
        document.addEventListener('touchmove', mousemove, true);
        document.addEventListener('touchend', mouseup, true);
        document.addEventListener('mousemove', mousemove, true);
        document.addEventListener('mouseup', mouseup, true);
    }

    function mousemove(event) {
        if (event.touches)
            var x = Math.min(Math.max((event.touches[0].clientX - dragStartX) / simulationElementScale, 0), 178);
        else
            var x = Math.min(Math.max((event.clientX - dragStartX) / simulationElementScale, 0), 178);
        handle.style.left = x + 'px';
        state.data.price = 1 + Math.round((x / 178) * 98);
        updateStateValueForElement(price);
    }

    function mouseup(event) {
        document.removeEventListener('touchmove', mousemove, true);
        document.removeEventListener('touchend', mouseup, true);
        document.removeEventListener('mousemove', mousemove, true);
        document.removeEventListener('mouseup', mouseup, true);
    }

    handle.addEventListener('mousedown', mousedown);
    handle.addEventListener('touchstart', mousedown);
});


button('button', function() {
    clickSound.play();
});


window.debug = {
    'state': state,
    'simulation': simulation
};


module.exports = {
    'screens': screens,
    'showScreen': showScreen
};

},{"./highscore":3,"./loader":4,"./polyfills":6,"./simulation":8,"./state":9,"howler":1}],6:[function(require,module,exports){
'use strict';


if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
    padString = String(typeof padString !== 'undefined' ? padString : ' ');
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}


module.exports = {};

},{}],7:[function(require,module,exports){
'use strict';


const random = Math.random;


function sign() {
    return random() < 0.5 ? -1 : 1;
}

function uniform(min, max) {
    // Returns a random floating point number, can be limited to a given range.
    var v = random();
    if (min === undefined)
        // uniform();
        return v;
    else if (max === undefined)
        // uniform(max);
        return v * min;
    else
        // uniform(min, max);
        return min + (max - min) * v;
}

function integer(min, max) {
    var n = uniform(min, max);
    return n >= 0 ? Math.floor(n) : Math.ceil(n);
}

function direction(out, startAngle, endAngle) {
    var angle = uniform(startAngle, endAngle);
    out.x = Math.cos(angle);
    out.y = Math.sin(angle);
}

function choice(population) {
    return population[integer(population.length)];
}

function shuffle(population) {
    // Shuffles the `population` array in place.
    var i = population.length, j, temp;
    while (--i > 0) {
        j = integer(i + 1);
        temp = population[i];
        population[i] = population[j];
        population[j] = temp;
    }
}

function sample(population, size) {
    // Returns a `size` length array of unique elements chosen from the `population` array.
    if (size > population.length)
        throw new Error('Sample larger than population');
    var result = new Array(size), i, j;
    if (size > population.length/3) {
        var pool = population.slice(0);
        for (i = 0; i < size; i++) {
            j = integer(population.length - i);
            result[i] = pool[j];
            pool[j] = pool[population.length - i - 1];
        }
    } else {
        var selected = new Array(size);
        for (i = 0; i < size; i++) {
            do {
                j = integer(population.length);
            } while (selected.indexOf(j) >= 0);
            selected[i] = j;
            result[i] = population[j];
        }
    }
    return result;
}


module.exports = {
    'sign': sign,
    'uniform': uniform,
    'integer': integer,
    'choice': choice,
    'shuffle': shuffle,
    'sample': sample,
    'direction': direction
};

},{}],8:[function(require,module,exports){
'use strict';


var state = require('./state');
var random = require('./random');
var Customer = require('./customer');


var WEATHER_TO_BACKGROUND = {
    'cloudy': 'images/scene/cloudy.png',
    'hazy': 'images/scene/hazy.png',
    'overcast': 'images/scene/overcast.png',
    'rain': 'images/scene/rain.png',
    'sunny': 'images/scene/sunny.png',
};

var WEATHER_TO_NUMBER = {
    'sunny': 0,
    'hazy': 1,
    'cloudy': 2,
    'overcast': 3,
    'rain': 4,
};


function Simulation() {
    this.images = null;
    this.context = null;
    this.time = 0;
    this.duration = 1000;
    this.frameRate = 4;

    this.onUpdate = null;
    this.onStep = null;
    this.onStop = null;

    this._requestId = -1;
    this._lastTime = -1;
    this._frameTime = 0;
    this.stopped = true;
    this.update = this.update.bind(this);

    this.customers = [];
    this.inPitcher = 0;
    this.soldOut = false;
    this.totalSold = 0;
    this.totalCustomers = 0;
}

Simulation.prototype.start = function() {
    this.stopped = false;
    this.time = 0;
    this._frameTime = 0;
    this.inPitcher = 0;
    this.soldOut = false;
    this.totalSold = 0;
    this.totalCustomers = 0;

    Customer.reset();

    this._requestId = requestAnimationFrame(this.update);
    this._lastTime = performance.now();

    this.refillPitcher();
    this.step();
};

Simulation.prototype.refillPitcher = function() {
    if (this.inPitcher === 0 &&
        state.data.lemons >= state.data.recipeLemons &&
        state.data.sugar >= state.data.recipeSugar) {
        this.inPitcher = 8 + state.data.recipeIce;
        state.data.lemons -= state.data.recipeLemons;
        state.data.sugar -= state.data.recipeSugar;
    }

    if (this.inPitcher === 0 || state.data.cups === 0 || state.data.ice < state.data.recipeIce)
        this.soldOut = true;
};

Simulation.prototype.buyOrPass = function() {
    var demand = ((state.data.temperatureFarenheit - 50) / 200 + (5 - this.weatherIndex) / 20) *
                 (((state.data.temperatureFarenheit / 4) - state.data.price) / (state.data.temperatureFarenheit / 4) + 1);
    if (state.data.repLevel < Math.random() * (state.data.repLevel - 500))
        demand = demand * state.data.reputation;
    demand *= (state.data.recipeLemons + 1) / 5;
    demand *= (state.data.recipeSugar + 4) / 8;

    for (var i = 0; i < this.customers.length; i++) {
        var customer = this.customers[i];
        if (customer.bubbleTime > 0)
            demand *= customer.bubble === 0 ? 1.3 : 0.5;
    }

    return (demand + random.uniform(-0.1, 0.1)) * 1.3;
};

Simulation.prototype.buyGlass = function(customer) {
    if (!this.soldOut && this.inPitcher > 0 &&
        state.data.cups > 0 && state.data.ice >= state.data.recipeIce) {
        this.inPitcher -= 1;
        state.data.ice -= state.data.recipeIce;
        state.data.cups -= 1;
        state.data.money += state.data.price;
        state.data.totalIncome += state.data.price;
        this.totalSold += 1;

        this.refillPitcher();

        if (this.giveRep() < 1) {
            var bubble = this.checkBubble();
            if (bubble > 0)
                customer.addBubble(bubble);
        } else if (Math.random() < 0.3)
            customer.addBubble(0);

        return true;
    } else {
        this.soldOut = true;
        return false;
    }
};

Simulation.prototype.giveRep = function() {
    var opinion = 0.8 + Math.random() * 0.4;
    opinion *= state.data.recipeLemons / 4;
    opinion *= state.data.recipeSugar / 4;
    opinion *= state.data.recipeIce / ((state.data.temperatureFarenheit - 50) / 5) + 1;
    opinion *= ((state.data.temperatureFarenheit - 50) / 5 + 1) / (state.data.recipeIce+4);
    opinion *= (state.data.temperatureFarenheit / 4 - state.data.price) / (state.data.temperatureFarenheit/4) + 1;
    opinion = Math.min(Math.max(opinion, 0), 2);
    state.data.reputation += opinion;
    state.data.repLevel++;
    return opinion;
};

var _reasons = [0, 0, 0];

Simulation.prototype.checkBubble = function() {
    // Yuck!
    if (state.data.recipeLemons < 4 || state.data.recipeSugar < 4)
        _reasons[2] = 1;
    else
        _reasons[2] = 0;

    // More ice!
    if (state.data.recipeIce < (state.data.temperatureFarenheit - 49) / 5)
        _reasons[1] = 1;
    else
        _reasons[1] = 0;

    // $$!
    if (state.data.price > state.data.temperatureFarenheit / 4)
        _reasons[0] = 1;
    else
        _reasons[0] = 0;

    var a = Math.floor(Math.random() * 3);
    return _reasons[a] === 1 ? a + 1 : 0;
};

Simulation.prototype.drawRain = function() {
    this.context.lineWidth = 1;
    this.context.strokeStyle = '#999';
    this.context.beginPath();

    var maxRain = random.integer(200, 400);
    for (var t = 0; t < maxRain; t++) {
        var x = Math.random() * 576;
        var y = Math.random() * 378;
        this.context.moveTo(x, y);
        this.context.lineTo(x + 2, y + 6);
    }

    this.context.stroke();
};

Simulation.prototype.update = function(now) {
    if (this.stopped)
        return;

    var elapsed = Math.min(0.1, (now - this._lastTime) / 1000);
    this._lastTime = now;
    this._frameTime += elapsed;

    if (this.onUpdate)
        this.onUpdate.call(null, this);

    if (this._frameTime >= 1/this.frameRate) {
        this.step();
        this._frameTime -= 1/this.frameRate;
    }

    if (this.time >= this.duration)
        this.stop();
    else
        this._requestId = requestAnimationFrame(this.update);
};

Simulation.prototype.step = function() {
    this.time += 1;

    if (Math.random() < 0.1)
        this.addCustomer();

    this.context.drawImage(this.images[WEATHER_TO_BACKGROUND[state.data.weather]], 0, 0);

    if (this.soldOut)
        this.context.drawImage(this.images['images/sold_out.png'], 220, 292);

    for (var i = 0; i < this.customers.length; i++)
        if (!this.customers[i].step()) {
            this.customers.splice(i, 1);
            i -= 1;
        }

    if (state.data.weather === 'rain')
        this.drawRain();

    if (this.onStep)
        this.onStep.call(null, this);
};

Simulation.prototype.addCustomer = function() {
    this.customers.push(new Customer(this));
    this.totalCustomers += 1;
};

Simulation.prototype.stop = function() {
    this.stopped = true;
    this.customers.length = 0;
    if (this._requestId !== -1) {
        cancelAnimationFrame(this._requestId);
        this._requestId = -1;
    }

    if (this.onStop)
        this.onStop.call(null, this);
};

Object.defineProperties(Simulation.prototype, {
    'weatherIndex': {
        'get': function() {
            return WEATHER_TO_NUMBER[state.data.weather];
        }
    }
});


module.exports = new Simulation();

},{"./customer":2,"./random":7,"./state":9}],9:[function(require,module,exports){
'use strict';


var random = require('./random');


var WEATHER = ['sunny', 'hazy', 'cloudy', 'overcast', 'rain'];
var WEATHER_NAMES = {
    'sunny': 'Clear and Sunny',
    'hazy': 'Hazy',
    'cloudy': 'Cloudy',
    'overcast': 'Overcast',
    'rain': 'Rain!'
};

var state = null;


function money(value) {
    var sign = '';
    if (value < 0) {
        sign = '−';
        value = Math.abs(value);
    }
    return sign + '$' + Math.floor(value / 100) + '.' + Math.floor(value % 100).toString().padStart(2, '0');
}


function displayMoney(key) {
    return money(state[key]);
}


function displayTemperature(key) {
    var temperature = state[key];
    var farenheit = Math.round(temperature * 9/5 + 32);
    return farenheit + '°F / ' + temperature + '°C';
}


function displayWeather(key) {
    return WEATHER_NAMES[state[key]];
}


function create(duration) {
    state = {
        'duration': duration,
        'day': 0,
        'cups': 0,
        'lemons': 0,
        'sugar': 0,
        'ice': 0,
        'money': 2000,  // Cents
        'temperature': 0,
        'temperatureFarenheit': 0,
        'weather': null,
        'price': 25,  // Cents
        'recipeLemons': 4,
        'recipeSugar': 4,
        'recipeIce': 4,
        'popularity': 0,
        'totalIncome': 0,
        'totalExpenses': 0,
        'priceCups1': 0,
        'priceCups2': 0,
        'priceCups3': 0,
        'priceLemons1': 0,
        'priceLemons2': 0,
        'priceLemons3': 0,
        'priceSugar1': 0,
        'priceSugar2': 0,
        'priceSugar3': 0,
        'priceIce1': 0,
        'priceIce2': 0,
        'priceIce3': 0,
        'repLevel': 0,
        'reputation': 0
    };

    newDay();
    save();

    return state;
}


function load() {
    try {
        state = JSON.parse(localStorage.getItem('LEMONADE_STAND'));
    } catch (error) {
        create();
        return false;
    }

    return true;
}


function save() {
    try {
        localStorage.setItem('LEMONADE_STAND', JSON.stringify(state));
        return true;
    } catch (error) {
        return false;
    }
}


function newDay() {
    state.day += 1;
    state.weather = random.choice(WEATHER);
    state.temperature = random.integer(11, 37);
    state.temperatureFarenheit = Math.round(state.temperature * 9/5 + 32);

    state.priceCups1 = random.integer(75, 100);
    state.priceCups2 = random.integer(150, 175);
    state.priceCups3 = random.integer(275, 325);

    state.priceLemons1 = random.integer(50, 100);
    state.priceLemons2 = random.integer(200, 250);
    state.priceLemons3 = random.integer(400, 450);

    state.priceSugar1 = random.integer(50, 75);
    state.priceSugar2 = random.integer(150, 175);
    state.priceSugar3 = random.integer(325, 350);

    state.priceIce1 = random.integer(75, 100);
    state.priceIce2 = random.integer(200, 225);
    state.priceIce3 = random.integer(350, 400);
}


module.exports = {
    'money': money,
    'create': create,
    'load': load,
    'save': save,
    'newDay': newDay,
    'display': {
        'money': displayMoney.bind(null, 'money'),
        'temperature': displayTemperature.bind(null, 'temperature'),
        'weather': displayWeather.bind(null, 'weather'),
        'price': displayMoney.bind(null, 'price'),
        'priceCups1': displayMoney.bind(null, 'priceCups1'),
        'priceCups2': displayMoney.bind(null, 'priceCups2'),
        'priceCups3': displayMoney.bind(null, 'priceCups3'),
        'priceLemons1': displayMoney.bind(null, 'priceLemons1'),
        'priceLemons2': displayMoney.bind(null, 'priceLemons2'),
        'priceLemons3': displayMoney.bind(null, 'priceLemons3'),
        'priceSugar1': displayMoney.bind(null, 'priceSugar1'),
        'priceSugar2': displayMoney.bind(null, 'priceSugar2'),
        'priceSugar3': displayMoney.bind(null, 'priceSugar3'),
        'priceIce1': displayMoney.bind(null, 'priceIce1'),
        'priceIce2': displayMoney.bind(null, 'priceIce2'),
        'priceIce3': displayMoney.bind(null, 'priceIce3'),
        'totalIncome': displayMoney.bind(null, 'totalIncome'),
        'totalExpenses': displayMoney.bind(null, 'totalExpenses')
    },
    get data() {
        return state;
    }
};

},{"./random":7}]},{},[5]);
