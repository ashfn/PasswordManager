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
var selectedEntry;


let commandsList = [
  "LIST",
  "SAVE",
  "MAKE",
  "SELECT",
  "SEARCH",
  "HELP"
]
//
var waiting = false;
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

function commandWorks(){
  
}

async function useCommand(command, wh){
  
    if(await command == "LIST"){
       // console.clear()
        socket.emit("list-entry-names")
    }
    else if(await command == "SAVE"){
       // console.clear()
        socket.emit("save", false)
    }
    else if(await command == "MAKE"){
       // console.clear()
        const name = await inquirer.prompt({
            name: 'name',
            type: 'input',
            message: 'Enter the name of the entry',
        });
        const url = await inquirer.prompt({
            name: 'url',
            type: 'input',
            message: 'Enter the URL of the entry',
        });
        const value = await inquirer.prompt({
            name: 'value',
            type: 'password',
            message: 'Enter the value of the entry',
        });
        inquirer
        .prompt([
        {
            type: 'list',
            name: 'option',
            message: 'Confirm?',
            choices: ['Enter'],
        },
        ])
        .then(answers => {
            if(answers.option == 'Enter'){
              console.clear()
              console.log("Waiting for response from server...")
              socket.emit("entry-make", name.name,url.url,value.value)
              waiting = true;
              setTimeout(function() {
                if(waiting){
                  console.log("Server did not respond for 3000ms. Entry creation failed.")
                  waitForContinue(wh)
                }
              }, 3000)
            }else{
                loop(wh)
            }
        });
    }
    else if(await command == "SELECT"){
       // console.clear()
        const query = await inquirer.prompt({
            name: 'query',
            type: 'input',
            message: 'Enter the name of the entry',
        });
        console.clear()
        console.log("Searching for entry \""+ query.query+"\" in warehouse \"" + wh + "\"...");
        socket.emit("get-entry", query.query);
    }
    else if(await command == "SEARCH"){
       // console.clear()
        const query = await inquirer.prompt({
            name: 'query',
            type: 'input',
            message: 'Enter the name of the entry',
        });
        console.clear()
        console.log("Searching for entry \""+ query.query+"\" in warehouse \"" + wh + "\"...")
        socket.emit("entry-exists", query.query)
    }
    else if(await command == "HELP"){
       // console.clear()
        console.log("Listing all commands:")
        console.log("- LIST   - List all entries inside of the warehouse.")
        console.log("- SEARCH - Search for an entry with the entry's name.")
        console.log("- SELECT - Open an entry so that you can read, edit or delete it.")
        console.log("- MAKE   - Create an entry and add it to the warehouse")
        console.log("- RENAME - Rename the warehouse")
        console.log("- PASSWD - Change the password for the warehouse.")
        waitForContinue(wh)
    }
}

function receiveEntry(entry){
  console.log("Manage Entry: "+entry.name)
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



socket.on("connection-working", () => {
    start();
})
 
socket.on("list-entry-names", (entries) =>{
    for (var i=0; i < entries.length; i++) {
        console.log(`Entry: ${entries[i]}`)
      }
    waitForContinue(wh)
})

socket.on("get-entry", (entry) => {
  console.log(entry)
})

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
    console.log("ERROR : "+x)
    waitForContinue(wh)
})

socket.on("save-status", (s,x) => {
    if(s == 1){
        console.log("Server-side save successfully completed.")
        if(x){
            exit(0)
        }
        waitForContinue(wh)
    }if(s == 2){
        console.log("Server-side save unsuccessfully completed.")
        waitForContinue(wh)
    }
})

socket.on("entry-created", (id) => {
  waiting=false;
  console.clear()
  console.log("Entry Created: "+id)
  waitForContinue(wh)
})

socket.on("disconnect", () =>{
  console.log("\nServer offline. Log-in prompt will show up when server is back online.\n")
})
/** 
socket.on("reconnect", () =>{
  console.log("\nServer back online. Log back in.\n")
  start();
})
*/