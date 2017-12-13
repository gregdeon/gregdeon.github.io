var canvas = document.getElementById("myCanvas");
var output_box = document.getElementById("outputText");
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

// Quotes
const QUOTES = [
    "I’ve learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
    "The greater danger for most of us lies not in setting our aim too high and falling short, but in setting our aim too low, and achieving our mark",
    "In science one tries to tell people, in such a way as to be understood by everyone, something that no one ever knew before. But in poetry, it's the exact opposite.",
    "The most difficult thing is the decision to act, the rest is merely tenacity."
];

// Indices of quotes to use for each game
const GAME_QUOTES = [
    [0, 1],
    [0, 1],
    [0, 1],
    [0, 1]
];

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

function quoteToWordList(quote)
{
    var quote_no_punc = quote.replace(/[,.!’']/g, "");
    var quote_uppercase = quote_no_punc.toUpperCase();
    ret = quote_uppercase.split(" ");
    return ret;
}

// ----- Game timer
// When the timer was started
var game_start_time;

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
var box_rate;

// Game state
// The word list we're using
var word_list;

// Which player is responsible for each letter
var word_players;

// How many points we've scored for each word so far
var word_scores;

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

// Which words mark the start of each quote
var quote_start_indices;

function setupGameState(game_num)
{
    // Set up the global game variables
    word_list = [];
    quote_start_indices = [];
    for(var i = 0; i < GAME_QUOTES[game_num].length; i++)
    {
        quote_num = GAME_QUOTES[game_num][i];
        word_list = word_list.concat(quoteToWordList(QUOTES[quote_num]));
        quote_start_indices.push(word_list.length);
    }
    
    word_players = [];
    word_scores = [];
    letters_shuffled = [];
    letters_typed = [];
    
    num_letters_left = 0;
    
    for(var word_idx = 0; word_idx < word_list.length; word_idx++)
    {
        word_players.push([]);
        word_scores.push(0);
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
            num_letters_left += 1;
        }
        
        letters_shuffled.push(null);
    }
    
    //letters_shuffled = shuffleArray(letters_shuffled);
    letters_shuffled = letters_shuffled.reverse();
    
    for(var i = 0; i < letters_on_screen.length; i++)
    {
        letters_on_screen[i] = null;
    }
    
    game_start_time = Date.now();
    last_box_update = null;
    box_rate = min_speed;
}

function getWordHits(word_idx)
{
    // Count how many letters each player missed
    // Returns [P1 hits, P1 misses, P2 hits, P2 misses]
    var ret = [0, 0, 0, 0];
    
    for(var i = 0; i < word_list[word_idx].length; i++)
    {
        player = word_players[word_idx][i];
        if(letters_typed[word_idx][i])
        {
            ret[2*player] += 1;
        }
        else
        {
            ret[2*player + 1] += 1;
        }
    }
    return ret;
}

function checkWordFinished(word_idx)
{
    for(var i = 0; i < word_list[word_idx].length; i++)
    {
        if(!letters_typed[word_idx][i])
        {
            return false;
        }
    }
    return true;
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

function getTotalScore()
{
    var score = 0;
    for(var i = 0; i < word_scores.length; i++)
    {
        score += word_scores[i];
    }
    return score;
}
    

// Adaptive speed parameters
// Minimum speed so we never get a speed of 0
const min_speed = 0.002;

// This is the error rate we want to achieve at equilibrium
const goal_error_rate = 0.1;

// This is our base update -- set it so we get good speeds without too much time
const ratio_up = 0.015;

// This is the downward update, based on the two above
const ratio_down = (1 - goal_error_rate) / (goal_error_rate) * ratio_up;

function setBoxSpeed(speed_up)
{
    // Set the letter scroll speed
    // If speed_up = true, increase by factor of 1+ratio_up;
    // otherwise, decrease by 1-ratio_down
    
    if(speed_up)
    {
        box_rate *= (1+ratio_up);
    }
    else
    {
        box_rate *= (1-ratio_down);
    }
    
    // Clamp so we don't crash the game
    if(box_rate < min_speed)
    {
        box_rate = min_speed;
    }
    
    // Debug
    console.log(box_rate);
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
            addNote(140, 40, '+1', PLAYER_COLORS[letters_on_screen[i].player], 200);
            letters_on_screen[i] = null;
            letters_typed[word_num][char_num] = true;
            num_letters_left -= 1;
            
            // Recalculate score for this word
            word_scores[word_num] = getWordScore(word_num);
            
            // If word finished, draw a bonus
            if(checkWordFinished(word_num))
            {
                addNote(180, 40, "+5 Bonus!", "#0000FF", 200);
            }
            
            // Update the scroll speed
            setBoxSpeed(true);
            
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
                setBoxSpeed(false);
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

//const game_words_x = 50;
//const game_words_dx = 250;
//const game_words_y = 200;
//const game_words_dy = 26;
//const game_words_size = 20;
//const game_words_per_column = 12;

const game_words_size = 20;
const game_words_x = 50;
const game_words_dx = game_words_size;
const game_words_y = 200;
const game_words_dy = game_words_size + 6;
const game_words_column = 35;

function displayWords()
{
    word_ix = 0;
    word_iy = 0;
    for(var i = 0; i < word_list.length; i++)
    {
        var is_new_quote = ((quote_start_indices.indexOf(i) >= 0));
        if(is_new_quote || word_ix + word_list[i].length >= game_words_column)
        {
            word_ix = 0;
            word_iy += 1;
        }
        var word_x = game_words_x + game_words_dx * word_ix;
        var word_y = game_words_y + game_words_dy * word_iy;
        
        //var word_x = game_words_x 
        //    + game_words_dx * Math.floor(i / game_words_per_column);
        //var word_y = game_words_y + (i % game_words_per_column)*game_words_dy;
        
        displayHangmanWord(
            word_list[i], 
            word_players[i], 
            letters_typed[i], 
            word_x,
            word_y,
            game_words_size
        );
        
        word_ix += (word_list[i].length + 1);
    }
}

// Flashy things
// List of flashy things to draw
// Each element of this list is an object with {x, y, message, color, last_time, time_to_remove}
var note_list = [];

// Note speed in px/ms
const note_speed = -0.05;

function processNotes()
{
    var current_time = Date.now();
    for(var i = 0; i < note_list.length; i++)
    {
        // Update height
        var dy = (current_time - note_list[i].last_time) * note_speed;
        note_list[i].y += dy;
        
        // Draw note
        ctx.beginPath();
        ctx.font = "24px Arial";
        ctx.fillStyle = note_list[i].color;
        ctx.fillText(note_list[i].message, note_list[i].x, note_list[i].y);
        ctx.closePath();
        
        // Update time
        note_list[i].last_time = current_time;
    }
    
    var i = 0; 
    while(i < note_list.length)
    {
        if(current_time > note_list[i].time_to_remove)
        {
            note_list.splice(i, 1);
        }
        else
        {
            i += 1;
        }
    }
}

function addNote(x, y, message, color, duration)
{
    var current_time = Date.now();
    note_list.push({
        x: x,
        y: y,
        message: message,
        color: color,
        last_time: current_time,
        time_to_remove: current_time + duration
    });
}


function drawScore()
{
    var score = getTotalScore();

    ctx.beginPath();
    ctx.font = "24px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Score: " + score, 10, 24);
    ctx.closePath();
    
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
const score_header_y = 45;
const score_ids_x = 80;
const score_words_x = 100;
const score_hits_x = 250;
const score_bonus_x = 300;
const score_value_x = 350;

const score_words_y = 65;
const score_words_size = 12;
const score_words_spacing = 14;
const score_num_words_column = 36;

function drawScoreHeader(base_x)
{
    ctx.font = "" + score_words_size + "px Arial";
    ctx.textAlign = "right";
    ctx.fillText("#", base_x + score_ids_x, score_header_y);
    ctx.textAlign = "left";
    ctx.fillText("Word", base_x + score_words_x, score_header_y);
    ctx.fillText("Hits", base_x + score_hits_x, score_header_y);
    ctx.fillText("Bonus", base_x + score_bonus_x, score_header_y);
    ctx.fillText("Score", base_x + score_value_x, score_header_y);
}

function scoreScreen()
{
    game_running = false;
    
    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Build string
    output_str = "";
    
    ctx.textAlign = "center";
    ctx.font = "24px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Scoreboard", canvas.width/2, 24);
    
    
    var total_score = 0;
    var total_hits = 0;
    
    var total_p1_hits = 0;
    var total_p1_miss = 0;
    var total_p2_hits = 0;
    var total_p2_miss = 0;
    
    var x_offset = 0;
    var word_x = score_words_x;
    var word_y;
    
    drawScoreHeader(0);
    
    if(word_list.length > score_num_words_column)
    {
        drawScoreHeader(canvas.width/2);
    }
    
    for(var i = 0; i < word_list.length; i++)
    {
        if(i >= score_num_words_column)
        {
            word_y = score_words_y + (i-score_num_words_column)*score_words_spacing;
            x_offset = canvas.width/2;
        } 
        else 
        {   
            word_y = score_words_y + i*score_words_spacing;
            x_offset = 0;
        }
        
        ctx.textAlign = "right";
        ctx.font = "" + score_words_size + "px Arial";
        ctx.fillStyle = "#000000";
        ctx.fillText("" + (i+1), x_offset + score_ids_x, word_y);
        
        displayHangmanWord(
            word_list[i], 
            word_players[i], 
            letters_typed[i], 
            x_offset + word_x,
            word_y,
            score_words_size
        );
        
        var hits = getWordHits(i);
        var score = word_scores[i];
        var sum_hits = hits[0] + hits[2];
        total_score += score;
        total_hits += sum_hits;
        total_p1_hits += hits[0];
        total_p1_miss += hits[1];
        total_p2_hits += hits[2];
        total_p2_miss += hits[3];

        ctx.fillStyle = "#000000";
        ctx.fillText("" + sum_hits, x_offset + score_hits_x, word_y);
        ctx.fillText("" + score - sum_hits, x_offset + score_bonus_x, word_y);
        ctx.fillText("" + score, x_offset + score_value_x, word_y);
        
        output_str = 
            output_str 
            + (i+1) + ","
            + hits[0] + ","
            + hits[1] + ","
            + hits[2] + ","
            + hits[3] + ","
            + score + "\n";
    }
    
    if(word_list.length > score_num_words_column)
    {
        word_y = score_words_y + score_num_words_column*score_words_spacing
    }
    else 
    {
        word_y += score_words_spacing * 1.5;
    }
    
    ctx.textAlign = "right";
    ctx.fillText("Total:", x_offset + score_hits_x - 10, word_y);
    ctx.textAlign = "left";
    ctx.fillText("" + total_hits, x_offset + score_hits_x, word_y);
    ctx.fillText("" + total_score - total_hits, x_offset + score_bonus_x, word_y);
    ctx.fillText("" + total_score, x_offset + score_value_x, word_y);
    
    output_str = 
        output_str
        + "total,"
        + total_p1_hits + ","
        + total_p1_miss + ","
        + total_p2_hits + ","
        + total_p2_miss + ","
        + total_score + "\n";
    
    output_box.value = output_str;
    
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
    drawScore();
    processNotes();

    //ctx.font = "36px Arial";
    //ctx.fillStyle = "#000000";
    //ctx.fillText("Last Key Pressed: " + String.fromCharCode(last_key_num), 450, 390);
    
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
    "Training Round",
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
const button_offset = 200;

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
    ctx.fillText("Typing Test", canvas.width/2, 100);
    
    // Buttons
    for(i = 0; i < game_names.length; i++)
    {
        button_x = (canvas.width - button_width) / 2;
        button_y = button_offset + (button_height + button_spacing)*i;
        
        ctx.beginPath();
        ctx.rect(button_x, button_y, button_width, button_height);
        ctx.strokeStyle = "#000000";
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