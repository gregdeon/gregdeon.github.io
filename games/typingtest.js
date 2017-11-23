var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

// Numbers representing each screen
const MAIN_MENU = -1;
const SINGLE_PLAYER = 0;
const GAME_1 = 1;
const GAME_2 = 2;
const GAME_3 = 3;

// Letters that could be assigned to each player
const player_letters = [
    // Player 1: left side
    [
        'Q', 'W', 'E', 'R', 'T', 
        'A', 'S', 'D', 'F',
        'Z', 'X', 'C', 'V'
    ],
    
    // Player 2: right side
    [
        'Y', 'U', 'I', 'O', 'P',
        'G', 'H', 'J', 'K', 'L',
        'B', 'N', 'M'
    ]
];

// Words for each game
const WORD_LISTS = [
    // Single player
    [
        "MYSTERIOUS",
        "CHALLENGER",
        "INITIATIVE",
        "CINCINATTI",
        "EMBROIDERY",
        "PERCUSSION",
        "TESSELLATE",
        "EQUESTRIAN",
        "LITERATURE",
        "WATERMELON",
        "BELONGINGS",
        "ABSOLUTION"
    ],
    
    // Balanced game
    [
        "CALIFORNIA",
        "GYMNASTICS",
        "SILHOUETTE",
        "RENOVATION",
        "DISPOSABLE",
        "GENEROSITY",
        "TEMPTATION",
        "APOSTROPHE",
        "DIABOLICAL",
        "TRAMPOLINE",
        "WATERMELON",
        "ADAPTATION",
    ],
    
    // P1-hard game
    [
        "FOOTPRINTS",
        "VULNERABLE",
        "IMPECCABLE",
        "GEOTHERMAL",
        "HEMISPHERE",
        "EUCALYPTUS",
        "STALAGMITE",
        "ELEMENTARY",
        "REFRACTION",
        "NARCISSIST",
        "STARSTRUCK",
        "ACCELERATE",
    ],
    
    // P2-hard game
    [
        "HYPHENATED",
        "VICTORIOUS",    
        "DISNEYLAND",    
        "BENEVOLENT",    
        "EXPEDITION",    
        "CHIMPANZEE",    
        "PLAGIARISM",    
        "SUGGESTION",    
        "CHINCHILLA",    
        "UBIQUITOUS",    
        "MONOPOLIES",    
        "UNYIELDING",
    ]
]

var current_mode = MAIN_MENU;

var game_running = false;

// Utilities
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.ceil(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function shuffleArray(arr)
{
    // TODO: Fisher-Yates shuffle
    return arr;
}   

// Game screen setup
// Width/height of each letter's box
const box_size = 80;
// Number of boxes that could be on the screen
const num_boxes = canvas.width / box_size + 1;
// Current distance from leftmost box edge to left screen edge
var box_offset = 0;
// Number of boxes appearing per ms
var box_rate = 0.002;

// Game state
// Letters currently on the screen
// One element of this list is like {word:1, char:3, player:1}
// If null, there's no letter here (probably someone typed it)
var letters_on_screen = [];
while(letters_on_screen.length < num_boxes)
{
    letters_on_screen.push(null);
}

// Letters that haven't been put on the screen yet
// Initialized randomly at start of game
var letters_shuffled;

// Whether we've typed each of the characters
// Initialized to all false at start of game
var letters_typed;

// The number of letters that could still be typed (haven't left the screen yet)
var letters_left;

function setupGameState(game_num)
{
    // Set up the global game variables
    
    letters_shuffled = [];
    letters_typed = [];
    
    for(var word_idx = 0; word_idx < WORD_LISTS.length; word_idx++)
    {
        letters_typed.push[];
        for(var char_idx = 0; char_idx < WORD_LISTS[word_idx].length; char_idx++)
        {    
            var letter = WORD_LISTS[word_idx][char_idx];
            var player = 0;
            if(player_letters[1].indexOf(letter) >= 0)
            {
                player = 1;
            }
            
            letters_shuffled.push({
                word_num:word_idx,
                char_num:char_idx,
                player: player
            });
            
            letters_typed.push(false);
        }
    }
    
    for(var i = 0; i < letters_on_screen.length; i++)
    {
        letters_on_screen[i] = null;
    }
    
    letters_left = letters_shuffled.length;
}

// Set the letter speed
function setBoxSpeed()
{
    // TODO: adaptive rate
    box_rate = 0.002;
//    time_elapsed = getTimeElapsed();
//    window_size = 5000;
////    while(hit_times[0].length > 0 && hit_times[0][0] < time_elapsed - window_size)
////        hit_times[0].shift();
//    
//    goal_hit = 0.8;
//    // rate_emp = 1.0 * hit_times[0].length / window_size;
//    // box_rate = rate_emp / goal_hit;
//    
//    rate_emp = 1.0 * (num_hit[0] + num_hit[1]) / getTimeElapsed();
//    box_rate = rate_emp / goal_hit;
//    //
//    //if(num_hit[0] > (num_hit[0] + num_miss[0]) * goal_hit)
//    //    box_rate *= 1.41;
//    
//    console.log(rate_emp + " " + box_rate);
//    
//    if(box_rate < 0.002)
//    {
//        box_rate = 0.002;
//    }
}

// Add a new random letter for player <player> to the right end of the list
// <player> should be 0 (player 1) or 1 (player 2)
function addNewLetter(player)
{
    arr = player_letters[player];

    new_letter = {
        letter: arr[getRandomInt(0, arr.length)],
        player: player
    };
    letters_on_screen.push(new_letter);
}

// Someone pressed <letter>
function handleSingleLetter(letter)
{
    // Don't allow people to type letters on the score screen
    if(!game_running)
        return;
    
    // Figure out which player did this
    if(player_letters[0].indexOf(letter) >= 0)
    {
        player = 0;
    }
    else if(player_letters[1].indexOf(letter) >= 0)
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
        if(letters_on_screen[i] === null)
            continue;
        
        if(letters_on_screen[i].player != player)
            continue;
        
        if(letters_on_screen[i].letter === letter)
        {
            letters_on_screen[i] = null;
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
        
        if (!(letters_on_screen[i] === null))
        {
            letter = letters_on_screen[i].letter;
            player = letters_on_screen[i].player;
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
            
            // Remove the left-most letter
            if(letters_on_screen[0] !== null)
            {
                num_miss[letters_on_screen[0].player] += 1;
                // TODO: customize this for different game modes
                setBoxSpeed();
            }
            
            // (pop item 0)
            letters_on_screen.splice(0, 1);
            
            var new_letter = null;
            if(letters_shuffled.length > 0)
            {
                new_letter = letters_shuffled.pop();
            }
            letters_on_screen.push(new_letter);
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

function displayHangmanWord(str, player, filled, x, y, size)
{
    // Display a set of blanks
    // str is the string to show
    // player is an int array (player[i] = 0/1: show character in P1/2 color)
    // filled is a bool array (filled[i] = True: show; False: only draw blank
    // x, y, size are position and size of string
    ctx.textAlign = "left";
    ctx.font = "" + size + "px Arial";
    
    for(var i = 0; i < str.length; i++)
    {
        // Positions
        var text_x = x + i*size;
        var text_y = y + size;
        var line_x_start = x + i*size;
        var line_x_end   = line_x_start + size*0.9;
        var line_y = y + size * 1.1;
        
        // Pick color based on player
        if(player[i] == 0)
        {
            ctx.strokeStyle = "#000000";
            ctx.fillStyle = "#000000";            
        }
        else
        {
            ctx.strokeStyle = "#FF0000";
            ctx.fillStyle = "#FF0000";            
        }
        
        // Draw line and maybe letter
        ctx.beginPath();
        ctx.moveTo(line_x_start, line_y);
        ctx.lineTo(line_x_end, line_y);
        if(filled[i])
        {
            ctx.fillText(str[i], text_x, text_y);
        }
        ctx.stroke();
        ctx.closePath();
    }
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
    for(j = 0; j < letters_on_screen.length; j++)
    {
        letters_on_screen[j] = null;
    }
    last_box_update = null;
    
    // Start the timer
    startTimer(GAME_LENGTH);
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
    
    // DEBUG
    displayHangmanWord("TEST WW", [0, 1, 0, 0, 1, 1, 0], [false, true, true, false, true, true, false], 10, 10, 24);
    
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