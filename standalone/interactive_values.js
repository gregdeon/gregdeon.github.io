'use strict';

// Helper function: compute n!

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function factorial(n) {
    var ret = 1;
    for (var i = 2; i <= n; i++) {
        ret *= i;
    }
    return ret;
}

// Helper function: return all permutations of an array
// From https://stackoverflow.com/a/37580979/3817091
function permute(permutation) {
    var length = permutation.length;
    var result = [permutation.slice()];
    var c = new Array(length).fill(0);
    var i = 1;

    while (i < length) {
        if (c[i] < i) {
            var k = i % 2 && c[i];
            var p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            result.push(permutation.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }
    return result;
}

// Get procedural values for game f
// s is a list of [s_2, s_3, ..., s_n]
function getProceduralValues(f, s) {
    var n = s.length + 1;
    var values = new Array(n);
    var players = new Array(n);
    var s_list = [1].concat(_toConsumableArray(s));

    for (var i = 0; i < n; i++) {
        values[i] = 0;
        players[i] = i;
    }
    var permutations = permute(players.slice());
    permutations.forEach(function (permutation) {
        var p1 = permutation[0];
        var player_bits = 0;
        var last_value = f[0];

        permutation.forEach(function (player, idx) {
            player_bits |= 1 << player;
            var new_value = f[player_bits];
            var marginal_contrib = new_value - last_value;
            last_value = new_value;

            values[player] += s_list[idx] * marginal_contrib;
            values[p1] += (1 - s_list[idx]) * marginal_contrib;
        });
    });

    for (var _i = 0; _i < n; _i++) {
        values[_i] /= factorial(n);
    }
    return values;
}

function calculateEqualValue(num_players, f) {
    var ret = new Array(num_players);
    var equal_value = f[Math.pow(2, num_players) - 1] / num_players;
    for (var i = 0; i < num_players; i++) {
        ret[i] = equal_value;
    }
    return ret;

    // Alternative method with procedural values
    // let s = new Array(num_players - 1);
    // for(let i = 0; i < num_players - 1; i++) {
    //     s[i] = 0;
    // }

    // return getProceduralValues(f, s);
}

function calculateShapleyValue(num_players, f) {
    var s = new Array(num_players - 1);
    for (var i = 0; i < num_players - 1; i++) {
        s[i] = 1;
    }

    return getProceduralValues(f, s);
}

function calculateSolidarityValue(num_players, f) {
    var s = new Array(num_players - 1);
    for (var i = 0; i < num_players - 1; i++) {
        s[i] = 1 / (i + 2);
    }

    return getProceduralValues(f, s);
}

function calculateProcedural2Value(num_players, f) {
    var s = new Array(num_players - 1);
    s[0] = 1;
    for (var i = 1; i < num_players - 1; i++) {
        s[i] = 0;
    }

    return getProceduralValues(f, s);
}

// Helper function: compute the squared error between two payments
function getSquaredError(theta_1, theta_2) {
    var ret = 0;
    for (var i = 0; i < theta_1.length; i++) {
        ret += Math.pow(theta_1[i] - theta_2[i], 2);
    }
    return ret;
}

// def getSymmetricPayProfile(f, theta):
//     symmetry_lists = [[] for _ in range(3)]
//     for i in range(len(symmetry_lists)):
//         for j in range(len(symmetry_lists)):
//             if checkSymmetry(f, i, j):
//                 symmetry_lists[i].append(theta[j])

//     return [sum(x) / len(x) for x in symmetry_lists]

// Helper function: check if player i and j are symmetric
function checkSymmetry(f, i, j) {
    var i_idx = 1 << i;
    var j_idx = 1 << j;
    for (var k = 0; k < f.length; k++) {
        if (k & i_idx || k & j_idx) continue;

        if (f[k | i_idx] != f[k | j_idx]) return false;
    }
    return true;
}

function getSymmetricPayProfile(num_players, f, theta) {
    var total_rewards = new Array(num_players);
    var num_rewards = new Array(num_players);

    for (var i = 0; i < num_players; i++) {
        total_rewards[i] = 0;
        num_rewards[i] = 0;

        for (var j = 0; j < num_players; j++) {
            if (checkSymmetry(f, i, j)) {
                total_rewards[i] += theta[j];
                num_rewards[i] += 1;
            }
        }

        total_rewards[i] /= num_rewards[i];
    }

    return total_rewards;
}

function getSurplus(f, theta) {
    var theta_sum = 0;
    for (var i = 0; i < theta.length; i++) {
        theta_sum += theta[i];
    }

    return f[f.length - 1] - theta_sum;
}

function getEfficientPayProfile(f, theta) {
    var surplus = getSurplus(f, theta);
    var ret = theta.slice();
    for (var i = 0; i < theta.length; i++) {
        ret[i] += surplus / theta.length;
    }
    return ret;
}

// Helper function: check if player i is null
function checkNullPlayer(f, i) {
    for (var k = 0; k < f.length; k++) {
        if (k & 1 << i) continue;

        if (f[k | 1 << i] != f[k]) return false;
    }
    return true;
}

function getNullPayProfile(num_players, f, theta) {
    var ret = theta.slice();
    var non_null_players = [];
    var null_surplus = 0;

    for (var i = 0; i < num_players; i++) {
        if (checkNullPlayer(f, i)) {
            ret[i] = 0;
            null_surplus += theta[i];
        } else {
            non_null_players.push(i);
        }
    }

    for (var _i2 = 0; _i2 < non_null_players.length; _i2++) {
        ret[non_null_players[_i2]] += null_surplus / non_null_players.length;
    }

    return ret;
}

function calculateShapleyError(num_players, f, theta) {
    var theta_sym = getSymmetricPayProfile(num_players, f, theta);
    var theta_sym_eff = getEfficientPayProfile(f, theta_sym);
    var theta_sym_eff_null = getNullPayProfile(num_players, f, theta_sym_eff);
    var shapley_value = calculateShapleyValue(num_players, f);
    return {
        sh: getSquaredError(theta, shapley_value),
        sym: getSquaredError(theta, theta_sym),
        eff: getSquaredError(theta_sym, theta_sym_eff),
        mrg: getSquaredError(theta_sym_eff, shapley_value),
        null: getSquaredError(theta_sym_eff, theta_sym_eff_null),
        add: getSquaredError(theta_sym_eff_null, shapley_value)
    };
}

// Helper function: convert 7 -> "123"
function convertIndexToPlayerString(idx, num_players) {
    if (idx == 0) {
        return "0";
    }

    var players_string = "";
    for (var i = 0; i < num_players; i++) {
        if (idx & 1 << i) {
            players_string += i + 1;
        }
    }
    return players_string;
}

// Helper function: convert "123" -> 7
function convertPlayerStringToIndex(player_string) {
    var player_chars = player_string.split("");
    var ret = 0;
    player_chars.forEach(function (char) {
        var player_num = parseInt(char);
        if (isNaN(player_num)) {
            return NaN;
        } else if (player_num > 0) {
            ret |= 1 << player_num - 1;
        }
    });
    return ret;
}

var CharacteristicFunctionDisplay = function (_React$Component) {
    _inherits(CharacteristicFunctionDisplay, _React$Component);

    function CharacteristicFunctionDisplay(props) {
        _classCallCheck(this, CharacteristicFunctionDisplay);

        var _this = _possibleConstructorReturn(this, (CharacteristicFunctionDisplay.__proto__ || Object.getPrototypeOf(CharacteristicFunctionDisplay)).call(this, props));

        _this.state = {
            visible: true
        };
        return _this;
    }

    _createClass(CharacteristicFunctionDisplay, [{
        key: "toggleVisibility",
        value: function toggleVisibility() {
            this.setState({
                visible: !this.state.visible
            });
        }
    }, {
        key: "render",
        value: function render() {
            var _this2 = this;

            return React.createElement(
                "div",
                null,
                React.createElement(
                    "button",
                    { onClick: this.toggleVisibility.bind(this) },
                    this.state.visible ? "Hide" : "Show"
                ),
                React.createElement(
                    "span",
                    null,
                    React.createElement(
                        "b",
                        null,
                        "Characteristic function:"
                    )
                ),
                this.state.visible ? React.createElement(
                    "table",
                    null,
                    React.createElement(
                        "tbody",
                        null,
                        this.props.values.map(function (value, idx) {
                            var players_string = convertIndexToPlayerString(idx, _this2.props.num_players);
                            return React.createElement(
                                "tr",
                                { key: idx },
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        "f(" + players_string + ")"
                                    )
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        " = " + value
                                    )
                                )
                            );
                        })
                    )
                ) : null
            );
        }
    }]);

    return CharacteristicFunctionDisplay;
}(React.Component);

var ValueDisplay = function (_React$Component2) {
    _inherits(ValueDisplay, _React$Component2);

    function ValueDisplay(props) {
        _classCallCheck(this, ValueDisplay);

        var _this3 = _possibleConstructorReturn(this, (ValueDisplay.__proto__ || Object.getPrototypeOf(ValueDisplay)).call(this, props));

        _this3.state = {
            visible: true
        };
        return _this3;
    }

    _createClass(ValueDisplay, [{
        key: "toggleVisibility",
        value: function toggleVisibility() {
            this.setState({
                visible: !this.state.visible
            });
        }
    }, {
        key: "renderErrors",
        value: function renderErrors() {
            var _this4 = this;

            if (!this.props.errors) {
                return null;
            }

            return ['sh', 'sym', 'eff', 'mrg', 'null', 'add'].map(function (err_type) {
                var err_name = "e_" + err_type;
                return React.createElement(
                    "tr",
                    { key: err_name },
                    React.createElement(
                        "td",
                        null,
                        React.createElement(
                            "span",
                            null,
                            err_name + "^2"
                        )
                    ),
                    React.createElement(
                        "td",
                        null,
                        React.createElement(
                            "span",
                            null,
                            " = " + parseFloat(_this4.props.errors[err_type]).toFixed(3)
                        )
                    )
                );
            });
        }
    }, {
        key: "render",
        value: function render() {
            return React.createElement(
                "div",
                null,
                React.createElement(
                    "button",
                    { onClick: this.toggleVisibility.bind(this) },
                    this.state.visible ? "Hide" : "Show"
                ),
                React.createElement(
                    "span",
                    null,
                    React.createElement(
                        "b",
                        null,
                        this.props.name + ":"
                    )
                ),
                this.state.visible ? React.createElement(
                    "table",
                    null,
                    React.createElement(
                        "tbody",
                        null,
                        this.props.values.map(function (value, idx) {
                            // let players_string = convertIndexToPlayerString(idx, this.state.num_players);
                            return React.createElement(
                                "tr",
                                { key: idx },
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        "v(" + (idx + 1) + ")"
                                    )
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        "= " + parseFloat(value).toFixed(3)
                                    )
                                )
                            );
                        }),
                        this.renderErrors()
                    )
                ) : null
            );
        }
    }]);

    return ValueDisplay;
}(React.Component);

var ValueCalculator = function (_React$Component3) {
    _inherits(ValueCalculator, _React$Component3);

    function ValueCalculator(props) {
        _classCallCheck(this, ValueCalculator);

        var _this5 = _possibleConstructorReturn(this, (ValueCalculator.__proto__ || Object.getPrototypeOf(ValueCalculator)).call(this, props));

        _this5.state = {
            game_text: ["3", "1 10", "2 20", "12 25", "3 30", "13 35", "23 45", "123 50"].join("\n"),
            error_message: "",
            s: ["1", "1"],

            num_players: 3,
            f: [0, 0, 0, 0, 0, 0, 0, 0],
            equal_value: ['?', '?', '?'],
            shapley_value: ['?', '?', '?'],
            solidarity_value: ['?', '?', '?'],
            procedural_value: ['?', '?', '?']
        };
        return _this5;
    }

    _createClass(ValueCalculator, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            this.updateGame();
        }

        // Update text when user types

    }, {
        key: "setGameText",
        value: function setGameText(event) {
            this.setState({ game_text: event.target.value }, this.updateGame.bind(this));
        }
    }, {
        key: "updateGame",
        value: function updateGame() {
            var characteristic_func = this.getGameFromText();
            if (!characteristic_func) return;
            var num_players = characteristic_func.num_players,
                f = characteristic_func.f;


            var s = this.state.s.slice();
            if (num_players > this.state.num_players) {
                for (var i = this.state.num_players; i < num_players; i++) {
                    s.push("0");
                }
            } else {
                s = s.slice(0, num_players - 1);
            }

            var equal_value = calculateEqualValue(num_players, f);
            var solidarity_value = calculateSolidarityValue(num_players, f);

            var s_floats = s.map(function (s_string) {
                return parseFloat(s_string);
            });
            var procedural_value = getProceduralValues(f, s_floats);

            this.setState({
                num_players: num_players,
                f: f,
                s: s,
                equal_value: equal_value,
                equal_error: calculateShapleyError(num_players, f, equal_value),
                shapley_value: calculateShapleyValue(num_players, f),
                solidarity_value: solidarity_value,
                solidarity_error: calculateShapleyError(num_players, f, solidarity_value),
                procedural_value: procedural_value,
                procedural_error: calculateShapleyError(num_players, f, procedural_value)
            });
        }
    }, {
        key: "getGameFromText",
        value: function getGameFromText() {
            var lines = this.state.game_text.split("\n");
            var num_players = parseInt(lines[0]);

            if (isNaN(num_players)) {
                this.setState({ error_message: "Error parsing number of players on line 1: '" + lines[0] + "'" });
                return null;
            }

            var value_list = new Array(Math.pow(2, num_players));
            value_list.fill(0);

            for (var i = 1; i < lines.length; i++) {
                if (lines[i].trim().length == 0) {
                    continue;
                }
                var line_split = lines[i].split(" ");
                var player_index = convertPlayerStringToIndex(line_split[0]);
                var value = parseFloat(line_split[1]);

                if (isNaN(player_index) || isNaN(value)) {
                    this.setState({
                        error_message: "Error parsing characteristic function on line " + (i + 1) + ": '" + lines[i] + "'"
                    });
                    return null;
                }

                if (player_index < 0 || player_index >= value_list.length) {
                    this.setState({
                        error_message: "Can't handle players '" + line_split[0] + "' in a " + num_players + " player game"
                    });
                    return null;
                }

                value_list[player_index] = value;
            }

            this.setState({
                error_message: ""
            });
            return { num_players: num_players, f: value_list };
        }
    }, {
        key: "setSValue",
        value: function setSValue(index, event) {
            var new_s = this.state.s.slice();
            new_s[index] = event.target.value;
            this.setState({ s: new_s }, this.updateGame.bind(this));
        }
    }, {
        key: "render",
        value: function render() {
            var _this6 = this;

            return React.createElement(
                "div",
                null,
                React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "span",
                        null,
                        React.createElement(
                            "b",
                            null,
                            "Input:"
                        )
                    )
                ),
                React.createElement(
                    "div",
                    null,
                    React.createElement("textarea", {
                        id: "game_text",
                        value: this.state.game_text,
                        onChange: this.setGameText.bind(this),
                        style: { width: "600px", minHeight: "200px", resize: "none" }
                    })
                ),
                React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "span",
                        { style: { color: "red" } },
                        this.state.error_message
                    )
                ),
                React.createElement(CharacteristicFunctionDisplay, {
                    num_players: this.state.num_players,
                    values: this.state.f
                }),
                React.createElement(ValueDisplay, {
                    name: "Shapley (s_i = 1)",
                    values: this.state.shapley_value
                }),
                React.createElement(ValueDisplay, {
                    name: "Equal (s_i = 0)",
                    values: this.state.equal_value,
                    errors: this.state.equal_error
                }),
                React.createElement(ValueDisplay, {
                    name: "Solidarity (s_i = 1/i)",
                    values: this.state.solidarity_value,
                    errors: this.state.solidarity_error
                }),
                React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "b",
                        null,
                        "Procedural coefficients:"
                    )
                ),
                this.state.num_players ? React.createElement(
                    "table",
                    null,
                    React.createElement(
                        "tbody",
                        null,
                        this.state.s.map(function (value, idx) {
                            // let players_string = convertIndexToPlayerString(idx, this.state.num_players);
                            return React.createElement(
                                "tr",
                                { key: idx },
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        "s_" + (idx + 2)
                                    )
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(
                                        "span",
                                        null,
                                        "= "
                                    ),
                                    React.createElement("input", { value: isNaN(value) ? "" : value, onChange: _this6.setSValue.bind(_this6, idx) })
                                )
                            );
                        })
                    )
                ) : null,
                React.createElement(ValueDisplay, {
                    name: "Procedural",
                    values: this.state.procedural_value,
                    errors: this.state.procedural_error
                })
            );
        }
    }]);

    return ValueCalculator;
}(React.Component);

var domContainer = document.querySelector('#react_container');
ReactDOM.render(React.createElement(ValueCalculator, null), domContainer);