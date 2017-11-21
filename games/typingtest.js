var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");


const MAIN_MENU = -1;
const SINGLE_PLAYER = 0;
const GAME_1 = 1;
const GAME_2 = 2;
const GAME_3 = 3;
var current_mode = MAIN_MENU;

var game_running = false;

// Utilities
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.ceil(max);
    return Math.floor(Math.random() * (max - min)) + min;
}


// ----- Game timer
// When the timer was started
var start_date;

// How long the timer should last
var timer_length = 60000;

// Start a timer that will last <length> milliseconds
function startTimer(length)
{
    timer_length = length;
    start_date = Date.now();
}

// Check how much time has elapsed so far
function getTimeElapsed()
{
    current_date = Date.now();
    time_elapsed = current_date - start_date;
    return time_elapsed;
}

// Check how many milliseconds are left on the running timer
function getTimeLeft()
{
    return timer_length - getTimeElapsed();
}

// Draw the timer
function drawTimer()
{
    time_left_ms = getTimeLeft();
    time_left_s = Math.ceil(time_left_ms / 1000);

    ctx.font = "36px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.fillText("Time: " + time_left_s, 650, 36);
}

// Game state
// Letters that could be generated for each player
var valid_letters = [
//    Top/bottom rows
//    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O'],
//    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']

// Left/right sides
    ['W', 'E', 'R', 'T', 'S', 'D', 'F', 'G'],
    ['Y', 'U', 'I', 'O', 'H', 'J', 'K', 'L']
];

// Letters currently on the screen
// One element of this list is like {letter:'Q', player:1}
// If null, there's no letter here (probably someone typed it)
var letters_to_type = [];

// Number of hits and misses for each player
var num_hit = [0, 0];
var num_miss = [0, 0];

//var hit_times = [[], []]

var box_size = 80;
var box_offset = 0;
var box_rate = 0.002;
var num_boxes = canvas.width / box_size + 1;

// Initial set of letters is empty
while(letters_to_type.length < num_boxes)
{
    letters_to_type.push(null);
}

// Set the letter speed
function setBoxSpeed()
{
    time_elapsed = getTimeElapsed();
    window_size = 5000;
//    while(hit_times[0].length > 0 && hit_times[0][0] < time_elapsed - window_size)
//        hit_times[0].shift();
    
    goal_hit = 0.8;
    // rate_emp = 1.0 * hit_times[0].length / window_size;
    // box_rate = rate_emp / goal_hit;
    
    rate_emp = 1.0 * (num_hit[0] + num_hit[1]) / getTimeElapsed();
    box_rate = rate_emp / goal_hit;
    //
    //if(num_hit[0] > (num_hit[0] + num_miss[0]) * goal_hit)
    //    box_rate *= 1.41;
    
    console.log(rate_emp + " " + box_rate);
    
    if(box_rate < 0.002)
    {
        box_rate = 0.002;
    }
}

// Take the left-most letter out of the list
// This happens when a letter hits the left edge
function removeFirstLetter()
{
    letters_to_type.splice(0, 1);
}

// Add a new random letter for player <player> to the right end of the list
// <player> should be 0 (player 1) or 1 (player 2)
function addNewLetter(player)
{
    arr = valid_letters[player];

    new_letter = {
        letter: arr[getRandomInt(0, arr.length)],
        player: player
    };
    letters_to_type.push(new_letter);
}

// Someone pressed <letter>
function handleSingleLetter(letter)
{
    // Don't allow people to type letters on the score screen
    if(!game_running)
        return;
    
    // Figure out which player did this
    if(valid_letters[0].indexOf(letter) >= 0)
    {
        player = 0;
    }
    else if(valid_letters[1].indexOf(letter) >= 0)
    {
        player = 1;
    }
    else 
    {
        return;
    }
    
    // Run through the list of letters on screen
    // If this matches one for this player, take it off
    for(i = 0; i < num_boxes; i++)
    {
        if(letters_to_type[i] === null)
            continue;
        
        if(letters_to_type[i].player != player)
            continue;
        
        if(letters_to_type[i].letter === letter)
        {
            letters_to_type[i] = null;
            num_hit[player] += 1;
            //hit_times[player].push(getTimeElapsed());
            
            // TODO: customize this for different game modes
            setBoxSpeed();
            
            break;
        }
    }
}

function drawBoxes() 
{
    for(i = 0; i < num_boxes; i++)
    {
        box_x = box_offset + i*box_size;
        box_y = (canvas.height - box_size) / 2;
        
        ctx.beginPath();
        ctx.rect(box_x, box_y, box_size, box_size);
        ctx.fillStyle = "#000000";
        ctx.stroke();
        ctx.closePath();
        
        text_x = box_x + box_size/2;
        text_y = box_y + 0.80*box_size;
        
        if (!(letters_to_type[i] === null))
        {
            letter = letters_to_type[i].letter;
            player = letters_to_type[i].player;
            ctx.font = "64px Arial";
            ctx.textAlign = "center";
            if(player == 0)
            {
                ctx.fillStyle = "#000000";
            } 
            else 
            {
                ctx.fillStyle = "#FF0000";
            }
            ctx.fillText(letter, text_x, text_y);
        }
    }
}

var last_box_update = null;
function updateBoxOffset()
{
    current_time = Date.now();
    
    if(last_box_update !== null)
    {
        time_diff = current_time - last_box_update;
        box_offset -= box_rate * box_size * time_diff;
        while (box_offset < -box_size)
        {
            box_offset += box_size;
            
            if(letters_to_type[0] !== null)
            {
                num_miss[letters_to_type[0].player] += 1;
                // TODO: customize this for different game modes
                setBoxSpeed();
            }
            
            removeFirstLetter();
            // TODO: decide which player to pick a new letter for
            player_num = getRandomInt(0,2);
            addNewLetter(player_num);
        }
    }  
    
    last_box_update = current_time;
}

function drawScore()
{
    num_1 = num_hit[0];
    den_1 = num_hit[0] + num_miss[0];
    
    if(den_1 == 0)
        percent_1 = 0;
    else 
        percent_1 = Math.floor(100.0 * num_1 / den_1);
    
    num_2 = num_hit[1];
    den_2 = num_hit[1] + num_miss[1];
    
    if(den_2 == 0)
        percent_2 = 0;
    else 
        percent_2 = Math.floor(100.0 * num_2 / den_2);
    
    ctx.textAlign = "left";
    ctx.font = "36px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText(
        "Player 1: " + num_1 + "/" + den_1 + " (" + percent_1 + "%)", 
        8, 36
    );
    
    ctx.fillStyle = "#FF0000";
    ctx.fillText(
        "Player 2: " + num_2 + "/" + den_2 + " (" + percent_2 + "%)", 
        8, 390
    );
}

// ----- Event queue
// The last key that was pressed -- only really helpful for debugging
var last_key_num = 'A'.charCodeAt(0);

// A stack of keys that have been pressed, but not processed yet
// Entries in this list are ASCII codes (ie: numbers, not strings)
var keys_pressed = [];

// Handle all of the pending keypress events
function handleKeys()
{
    min_letter_num = 'A'.charCodeAt(0);
    max_letter_num = 'Z'.charCodeAt(0);
    key_enter = 13;
    key_up = 38;
    key_down = 40;
    
    ret = false;
    
    while (keys_pressed.length > 0)
    {
        new_key = keys_pressed.pop();
        
        // Letters 
        if(new_key >= min_letter_num && new_key <= max_letter_num)
        {
            last_key_num = new_key;
            handleSingleLetter(String.fromCharCode(new_key));
        }
        
        // Menu navigation
        else
        {
            // Up
            if(new_key == 38 && selected_game > 0)
            {
                selected_game -= 1;
            }
            // Down
            else if(new_key == 40 && selected_game < game_names.length - 1)
            {
                selected_game += 1;
            }
            // Enter
            else if(new_key == 13)
            {
                ret = true;
            }
        }
    }
    
    return ret;
}

// ----- Game loops
// Display the final score (and payoffs?)
function scoreScreen()
{
    game_running = false;
    
    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // TODO: refactor score calculation
    num_1 = num_hit[0];
    den_1 = num_hit[0] + num_miss[0];
    
    if(den_1 == 0)
        percent_1 = 0;
    else 
        percent_1 = Math.floor(100.0 * num_1 / den_1);
    
    num_2 = num_hit[1];
    den_2 = num_hit[1] + num_miss[1];
    
    if(den_2 == 0)
        percent_2 = 0;
    else 
        percent_2 = Math.floor(100.0 * num_2 / den_2);
    
    ctx.textAlign = "center";
    ctx.font = "48px Arial";
    ctx.fillStyle = "#000000";
    
    ctx.fillText("Final Score:", canvas.width/2, 50);
    
    ctx.fillText("Player 1:", canvas.width/2, 150);
    ctx.fillText(
        "" + num_1 + "/" + den_1 + " (" + percent_1 + "%)", 
        canvas.width/2, 200
    );
    
    ctx.fillStyle = "#FF0000";
    ctx.fillText("Player 2:", canvas.width/2, 300);
    ctx.fillText(
        "" + num_2 + "/" + den_2 + " (" + percent_2 + "%)", 
        canvas.width/2, 350
    );
    
    return_to_menu = handleKeys();
    if(return_to_menu)
    {
        mainMenu();
        return;
    }
    
    requestAnimationFrame(scoreScreen);
}

function gameLoop()
{
    game_running = true;
    
    // Run game until timer up
    if(getTimeLeft() < 0)
    {
        scoreScreen();
        return;
    }
    
    handleKeys();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateBoxOffset();
    drawBoxes();
    drawTimer();
    drawScore();


    ctx.font = "36px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Last Key Pressed: " + String.fromCharCode(last_key_num), 450, 390);
    
    requestAnimationFrame(gameLoop);
}

function runGame(game_number)
{
    // Reset scores and letters
    num_hit[0] = 0;
    num_hit[1] = 0;
    num_miss[0] = 0;
    num_miss[1] = 0;
    for(j = 0; j < letters_to_type.length; j++)
    {
        letters_to_type[j] = null;
    }
    last_box_update = null;
    
    // Start the timer
    startTimer(10000);
    gameLoop();
}


// ----- Main menu screen
// Strings to write in each of the buttons
var game_names = [
    "Single Player",
    "Game 1",
    "Game 2",
    "Game 3"
];

// Which game is hovered right now
var selected_game = 0;

// Button sizing
var button_width = 300;
var button_height = 40;
var button_spacing = 30;
var button_offset = 100;

// Display the main menu screen
function mainMenu()
{
    // Handle keys to move cursor up/down
    // If returns true, we should start the game
    start_game = handleKeys()
    if(start_game)
    {
        runGame(selected_game);
        return;
    }
    
    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.textAlign = "center";
    ctx.font = "48px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Typing Test", canvas.width/2, 48);
    
    // Buttons
    for(i = 0; i < game_names.length; i++)
    {
        button_x = (canvas.width - button_width) / 2;
        button_y = button_offset + (button_height + button_spacing)*i;
        
        ctx.beginPath();
        ctx.rect(button_x, button_y, button_width, button_height);
        ctx.fillStyle = "#79d8d5";
        
        // Only fill the selected one
        if(i == selected_game)
        {
            ctx.fill();
        }
        ctx.stroke();
        ctx.closePath();
        
        ctx.font = "24px Arial";
        ctx.fillStyle = "#000000";
        ctx.fillText(game_names[i], canvas.width/2, button_y + button_height*0.7);
    }
    
    requestAnimationFrame(mainMenu);
}

function keyDownHandler(e) {
    keys_pressed.push(e.keyCode);
}

document.addEventListener("keydown", keyDownHandler, false);
mainMenu();