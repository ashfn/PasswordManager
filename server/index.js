// Imports
const express = require("express");
const {Server} = require("socket.io");
const SimpleCrypto = require("simple-crypto-js").default
const fs = require("fs")
const {v4: uuidv4} = require("uuid");
const { SocketAddress } = require("net");
const os = require("os")

// Options 
const port = 1234;
const encryptionkey = "test";
const datadir = "C:\\Users\\User\\Documents\\PasswordManager\\data\\";
const allowProbe = true;

// Server stuff
const app = express();
const l = app.listen(port);
const server = new Server(l, { cors: { origin: "*" } });

// Encryption
const crypto = new SimpleCrypto(encryptionkey)

// Loaded Warehouse
var warehouse = null;
var locked = false
var goodSocket = null;

// Classes
class Entry{
    constructor(name, url, content) {
        this.name = name;
        this.url = url;
        this.content = content;
        this.id = uuidv4();
    }
    getData(){
        return JSON.stringify(this);
    }
}

class Warehouse{
    constructor(masterPassword, entries, name) {
        this.masterPassword = masterPassword;
        this.entries = entries;
        this.name = name;
        this.id = uuidv4();
    }
    getData(){
        return JSON.stringify(this);
    }
}

// Functions
function saveWarehouse(warehouse){
    tempCrypto = new SimpleCrypto(warehouse.masterPassword);
    data = tempCrypto.encrypt(warehouse);
    fs.writeFile(datadir+"warehouse", data, err => {
        if (err) {
            console.error(err);
            return
        }
        console.log("Saved Warehouse: "+warehouse.name);
    })
}

function loadWarehouse(masterPassword){
    tempCrypto = new SimpleCrypto(masterPassword);
    const data = tempCrypto.decrypt(fs.readFileSync(datadir+'warehouse', 'utf8'));
    for(var i in data.entries){
        data.entries[i] = JSON.parse(data.entries[i])
    }
    return data;
}

function makeDefaultWarehouse(){
    defaultWarehouse = new Warehouse("warehouse", [], "defaultWarehouse");
    return defaultWarehouse;
}

function warehouseExists(){
    try {
        if (fs.existsSync(datadir+"warehouse")) {
            return true
        }
    }catch(err) {
        return false
    }
}

function startupWarehouseManager(){
    if(warehouseExists()){
        console.log("Warehouse exists, ready to load on request.")
    }else{
        console.log("No warehouse found! Making the default one.")
        x = makeDefaultWarehouse()
        saveWarehouse(x)
        console.log("Default warehouse created, please login and change the credentials!")
    }
}

function entryExists(warehouse, entry){
    var ex = false
    for(var i in warehouse.entries){
        if(i.name == entry) ex = true;
    }
    return ex
}

function getEntry(warehouse, entry){
    for(var i in warehouse.entries){
        if(i.name == entry) return i;
    }
}

startupWarehouseManager()

// Connection listener
server.on("connection", (socket) => {
    if(!locked){
        console.log("Connection")
        socket.emit("connection-working")
        socket.on("disconnect", () => {
            if(socket == goodSocket){
                goodSocket = null
                locked = false;
            }
        })
        socket.on("get-entry", (entry) => {
            if(entryExists(warehouse,entry)){
                socket.emit("get-entry", getEntry(warehouse,entry))
            }else{
                socket.emit("error", "Entry with that name does not exist.")
            }
        })
        socket.on("entry-exists", (entry) => {
            socket.emit("entry-exists", entryExists(warehouse,entry))
        })
        socket.on("probe", () => {
            if(allowProbe){
                socket.emit("probe-result", (
                    os.uptime(),
                    os.arch(),
                    os.cpus(),
                    os.hostname(),
                    os.version()
                ))
            }else{
                socket.emit("error", "Server Probe is disabled on this server.e")
            }
        })

        socket.on("try-login", (mp) =>{
            try{
                const dmp = crypto.decrypt(mp)
                warehouse = loadWarehouse(dmp)
                goodSocket = socket;
                locked = true
                console.log("Successful warehouse load from "+ socket.id)
                socket.emit("login-status", 1)
                socket.emit("warehouse-stats", warehouse.entries.length, warehouse.name)
            }catch(err) {
                socket.emit("login-status", 2)
                console.log("Unsuccessful warehouse load from "+ socket.id)
            }
        });

        socket.on("save", (exitClientOnSave) => {
            try{
                saveWarehouse(warehouse);
                socket.emit("save-status", 1, exitClientOnSave)
            }catch(err){
                socket.emit("error", "Error encountered whilst saving.")
                socket.emit("save-status", 2, exitClientOnSave)
            }
        });
    }else{
        socket.emit("Error", "User already connected. Try again later.")
        socket.disconnect()
    }
})