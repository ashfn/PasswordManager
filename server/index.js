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
const datadir = "C:\\Users\\User\\Documents\\PasswordManager2\\data\\";
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
  console.log(warehouse)
  data = tempCrypto.encrypt(warehouse);
  console.log(data)
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
        }else{
            return false
        }
    }catch(err) {
        console.log(err)
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
  for (var i=0; i < warehouse.entries.length; i++) {
    var t = warehouse.entries[i]
    if(t.name == entry){
      ex = true;
    } 
  }
  return ex
}

function getEntry(warehouse, entry){
  for (var i=0; i < warehouse.entries.length; i++) {
    var t = JSON.parse(warehouse.entries[i])
    if(t.name == entry){
      return t
    } 
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
        socket.on("list-entry-names", () => {
            var entriesR = []
            for (var i=0; i < warehouse.entries.length; i++) {
                entriesR.push(warehouse.entries[i].name)
            }
            socket.emit("list-entry-names", entriesR)
        })
        socket.on("entry-make", (name,url,value) =>{
          console.log(entryExists(warehouse,name))
          if(entryExists(warehouse,name)){
            socket.emit("error", "An entry with that name already exists.")
            return
          }
          e = new Entry(name,url,value)
          warehouse.entries.push(JSON.parse(e.getData()))
          socket.emit("entry-created", e.id)
        })
        socket.on("get-entry", (entry) => {
            if(entryExists(warehouse,entry)){
              console.log(getEntry(warehouse,entry))
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
                console.log(warehouse)
                goodSocket = socket;
                locked = true
                console.log("Successful warehouse load from "+ socket.id)
                socket.emit("login-status", 1)
                socket.emit("warehouse-stats", warehouse.entries.length, warehouse.name)
            }catch(err) {
                console.log(err)
                socket.emit("login-status", 2)
                console.log("Unsuccessful warehouse load from "+ socket.id)
            }
        });

        socket.on("save", (exitClientOnSave) => {
          console.log("debug")
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