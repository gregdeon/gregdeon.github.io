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
//        "INITIATIVE",
//        "CINCINATTI",
//        "EMBROIDERY",
//        "PERCUSSION",
//        "TESSELLATE",
//        "EQUESTRIAN",
//        "LITERATURE",
//        "WATERMELON",
//        "BELONGINGS",
//        "ABSOLUTION"
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

// Colors for each player
const PLAYER_COLORS = [
    "#000000",
    "#FF0000"
];

var current_mode = MAIN_MENU;

var game_running = false;

// Utilities
function getRandomInt(min, max) 
{
    min = Math.ceil(min);
    max = Math.ceil(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function shuffleArray(arr)
{
    for(var i = 0; i < arr.length-1; i++)
    {
        var j = getRandomInt(i, arr.length)
        var temp_val = arr[i];
        arr[i] = arr[j];
        arr[j] = temp_val;
    }

    return arr;
}   

// ----- Game timer
// When the timer was started
var game_start_date;

// Game screen setup
// Position of scrolling bar
const box_height = 50;
// Width/height of each letter's box
const box_size = 80;
// Number of boxes that could be on the screen
const num_boxes = canvas.width / box_size + 1;
// Current distance from leftmost box edge to left screen edge
var box_offset = 0;
// Number of boxes appearing per ms
// DEBUG
var box_rate = 0.002;
//var box_rate = 0.002;

// Game state
// The word list we're using
var word_list;

// Which player is responsible for each letter
var word_players;

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
var num_letters_left;

// The number of letters we typed (didn't miss)
var num_letters_typed;

function setupGameState(game_num)
{
    // Set up the global game variables
    word_list = WORD_LISTS[game_num];
    word_players = [];
    letters_shuffled = [];
    letters_typed = [];
    
    for(var word_idx = 0; word_idx < word_list.length; word_idx++)
    {
        word_players.push([]);
        letters_typed.push([]);
        for(var char_idx = 0; char_idx < word_list[word_idx].length; char_idx++)
        {
            // Add this character to the shuffled list 
            var letter = word_list[word_idx][char_idx];
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
            
            // Make a spot for the typed letter
            letters_typed[word_idx].push(false);
            word_players[word_idx].push(player);
        }
    }
    
    letters_shuffled = shuffleArray(letters_shuffled);
    
    for(var i = 0; i < letters_on_screen.length; i++)
    {
        letters_on_screen[i] = null;
    }
    
    num_letters_left = letters_shuffled.length;
    
    game_start_date = Date.now();
    last_box_update = null;
}

function getWordMisses(word_idx)
{
    // Count how many letters each player missed
    var ret = [0, 0];
    
    for(var i = 0; i < word_list[word_idx].length; i++)
    {
        if(!letters_typed[word_idx][i])
        {
            player = word_players[word_idx][i];
            ret[player] += 1;
        }
    }
    return ret;
}

function getWordScore(word_idx)
{
    // Return how many points the team earned for this word
    var score = 0;
    
    // +1 point for each letter
    for(var i = 0; i < word_list[word_idx].length; i++)
    {
        if(letters_typed[word_idx][i])
        {
            score += 1;
        }
    }
    
    // +5 points for the full word
    if(score == word_list[word_idx].length)
    {
        score += 5;
    }
    
    return score;
}

// Set the letter speed
function setBoxSpeed()
{
    // TODO: adaptive rate
    //box_rate = 0.002;

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

// Someone pressed <letter>
function handleSingleLetter(letter)
{
    // Don't allow people to type letters on the score screen
    if(!game_running)
        return;
    
    
    // Run through the list of letters on screen
    // If this matches one for this player, take it off
    for(i = 0; i < num_boxes; i++)
    {
        if(letters_on_screen[i] === null)
            continue;
        
        var word_num = letters_on_screen[i].word_num;
        var char_num = letters_on_screen[i].char_num;
        var box_letter = word_list[word_num][char_num];
        
        if(box_letter === letter)
        {
            // If we find a match, also update our counters
            letters_on_screen[i] = null;
            letters_typed[word_num][char_num] = true;
            num_letters_typed += 1;
            num_letters_left -= 1;
            
            // Update the scroll speed
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
        box_y = box_height;
        
        ctx.beginPath();
        ctx.rect(box_x, box_y, box_size, box_size);
        ctx.strokeStyle = "#000000";
        ctx.stroke();
        ctx.closePath();
        
        text_x = box_x + box_size/2;
        text_y = box_y + 0.80*box_size;
        
        if (!(letters_on_screen[i] === null))
        {        
            var word_num = letters_on_screen[i].word_num;
            var char_num = letters_on_screen[i].char_num;
            var box_player = letters_on_screen[i].player;
            var box_letter = word_list[word_num][char_num];
            
            ctx.font = "64px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = PLAYER_COLORS[box_player];
            ctx.fillText(box_letter, text_x, text_y);
        }
    }
}

var last_box_update = null;
function updateBoxOffset()
{
    var current_time = Date.now();
    
    if(last_box_update !== null)
    {
        time_diff = current_time - last_box_update;
        box_offset -= box_rate * box_size * time_diff;
        while (box_offset < -box_size)
        {
            box_offset += box_size;
            
            // Remove the left-most letter and update the scroll speed
            if(letters_on_screen[0] !== null)
            {
                num_letters_left -= 1;
                setBoxSpeed();
            }
            
            // (pop item 0)
            letters_on_screen.splice(0, 1);
            
            // Add a new letter to the right side
            // If there's one left in the shuffled list, use that one
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
        var text_y = y;
        var line_x_start = x + i*size;
        var line_x_end   = line_x_start + size*0.9;
        var line_y = text_y + size * 0.1;
        
        // Pick color based on player
        ctx.strokeStyle = PLAYER_COLORS[player[i]]
        ctx.fillStyle = PLAYER_COLORS[player[i]]
        
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

const game_words_x1 = 50;
const game_words_x2 = canvas.width/2 + 50;
const game_words_y = 170;
const game_words_size = 24;
const game_words_spacing = 32;

function displayWords()
{
    for(var i = 0; i < word_list.length; i += 2)
    {
        var word_x = game_words_x1;
        var word_y = game_words_y + (i/2)*game_words_spacing;
        
        displayHangmanWord(
            word_list[i], 
            word_players[i], 
            letters_typed[i], 
            word_x,
            word_y,
            game_words_size
        );
        
        if(i+1 < word_list.length)
        {
            word_x = game_words_x2;
            displayHangmanWord(
                word_list[i+1], 
                word_players[i+1], 
                letters_typed[i+1], 
                word_x,
                word_y,
                game_words_size
            );
        }
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
const score_header_y = 75;
const score_ids_x = 80;
const score_words_x = 100;
const score_p1_x = 320;
const score_p2_x = 450;
const score_value_x = 580;
const score_words_y = 100;
const score_words_size = 20;
const score_words_spacing = 22;

function scoreScreen()
{
    game_running = false;
    
    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.textAlign = "center";
    ctx.font = "40px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Game Over", canvas.width/2, 40);
    
    ctx.font = "" + score_words_size + "px Arial";
    ctx.textAlign = "right";
    ctx.fillText("#", score_ids_x, score_header_y);
    ctx.textAlign = "left";
    ctx.fillText("Word", score_words_x, score_header_y);
    ctx.fillText("P1 Misses", score_p1_x, score_header_y);
    ctx.fillText("P2 Misses", score_p2_x, score_header_y);
    ctx.fillText("Score", score_value_x, score_header_y);
    
    var total_score = 0;
    var word_x = score_words_x;
    var word_y;
    
    for(var i = 0; i < word_list.length; i++)
    {
        word_y = score_words_y + i*score_words_spacing;
        
        ctx.textAlign = "right";
        ctx.font = "" + score_words_size + "px Arial";
        ctx.fillStyle = "#000000";
        ctx.fillText("" + (i+1), score_ids_x, word_y);
        
        displayHangmanWord(
            word_list[i], 
            word_players[i], 
            letters_typed[i], 
            word_x,
            word_y,
            score_words_size
        );
        
        var miss = getWordMisses(i);
        var score = getWordScore(i);
        total_score += score;

        ctx.fillStyle = "#000000";
        ctx.fillText("" + miss[0], score_p1_x, word_y);
        ctx.fillText("" + miss[1], score_p2_x, word_y);
        ctx.fillText("" + score, score_value_x, word_y);
    }
    
    word_y += score_words_spacing * 1.5;
    ctx.textAlign = "right";
    ctx.fillText("Total:", score_value_x - 10, word_y);
    ctx.textAlign = "left";
    ctx.fillText("" + total_score, score_value_x, word_y);
    
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
    
    // Run game until no more letters to type
    if(num_letters_left == 0)
    {
        scoreScreen();
        return;
    }
    
    handleKeys();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateBoxOffset();
    drawBoxes();
    displayWords();

    ctx.font = "36px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Last Key Pressed: " + String.fromCharCode(last_key_num), 450, 390);
    
    console.log(getWordScore(0));
    
    requestAnimationFrame(gameLoop);
}

function runGame(game_number)
{
    // Reset scores and letters
    setupGameState(game_number);
    
    gameLoop();
}


// ----- Main menu screen
// Strings to write in each of the buttons
const game_names = [
    "Single Player",
    "Game 1",
    "Game 2",
    "Game 3"
];

// Which game is hovered right now
var selected_game = 0;

// Button sizing
const button_width = 300;
const button_height = 40;
const button_spacing = 30;
const button_offset = 100;

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