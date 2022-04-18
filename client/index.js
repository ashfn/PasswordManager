const { exit } = require("process");
const inquirer = require("inquirer")
io = require("socket.io-client");
const { prompt } = require('inquirer'); 
SimpleCrypto = require("simple-crypto-js").default;
readline = require('readline');

// Options
const server = "localhost";
const port = 1234;
const encryptionkey = "test";

// Encryption
const crypto = new SimpleCrypto(encryptionkey);

// Temp Storage
var wh;

function waitForContinue(wh){
    inquirer
    .prompt([
    {
        type: 'list',
        name: 'option',
        message: 'Continue?',
        choices: ['Enter'],
    },
    ])
    .then(answers => {
        if(answers.option == 'Enter'){
            loop(wh)
        }
    });
}

async function useCommand(command, wh){
    console.clear()
    if(command == "SELECT"){
        const query = await inquirer.prompt({
            name: 'query',
            type: 'input',
            message: 'Enter the name of the entry',
        });
        console.clear()
        console.log("Searching for entry \""+ query.query+"\" in warehouse \"" + wh + "\"...")
        socket.emit("get-entry")
    }
    if(command == "SEARCH"){
        const query = await inquirer.prompt({
            name: 'query',
            type: 'input',
            message: 'Enter the name of the entry',
        });
        console.clear()
        console.log("Searching for entry \""+ query.query+"\" in warehouse \"" + wh + "\"...")
        socket.emit("entry-exists", query.query)
    }
    if(command == "HELP"){
        console.log("Listing all commands:")
        console.log("- SEARCH - Search for an entry with the entry's name.")
        console.log("- SELECT - Open an entry so that you can read, edit or delete it.")
        console.log("- MAKE   - Create an entry and add it to the warehouse")
        console.log("- RENAME - Rename the warehouse")
        console.log("- PASSWD - Change the password for the warehouse.")
        waitForContinue(wh)
    }
}

const getCommand = (whName) => {
    const p = {
        type: "input",
        name: "command",
        message: `${whName}: `
    }
    prompt(p)
        .then(answer => {
            useCommand(answer.command.toUpperCase(), whName)
        })
        .catch(console.error)
}

const clearLastLine = () => {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 1);
}

function loop(wh){
    console.clear()
    useCommand(getCommand(wh))
}

async function start(){
    const answers = await inquirer.prompt({
        name: 'mp',
        type: 'password',
        message: 'Enter the master password',
    });

    mp = answers.mp;
    socket.emit('try-login', crypto.encrypt(mp));
    clearLastLine();
}

// Connect
socket = io.connect("http://"+server+":"+port);
start();

socket.on("entry-exists", (exists) => {
    if(exists) console.log("That entry does exist in the warehouse!")
    else console.log("That entry does not exist in the warehouse!")
    waitForContinue(wh)
})

socket.on("login-status", (statusCode) => {
    if(statusCode == 1){
        console.log("Login Success!")
    }if(statusCode == 2){
        console.log("Login Fail!")
        exit(0)
    }
});

socket.on("warehouse-stats", (x, y) => {
    console.log("==============\nWarehouse Name: "+y+"\nWarehouse Entries: "+x+"\n==============\n")
    loop(y)
    wh=y
});

socket.on("error", (x) => {
    console.log("ERROR SERVER SIDE: "+x)
})

socket.on("save-status", (s,x) => {
    if(s == 1){
        console.log("Server-side save successfully completed.")
        if(x){
            exit(0)
        }
    }if(s == 2){
        console.log("Server-side save unsuccessfully completed.")
    }
})