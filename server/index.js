// Imports
const express = require('express')
const SimpleCrypto = require("simple-crypto-js").default
const fs = require("fs")
const {v4: uuidv4} = require("uuid");
const { SocketAddress } = require("net");

// Options 
const port = 8080;
const encryptionkey = "test";
const datadir = "C:\\Users\\User\\Documents\\PasswordManager2\\data\\";
const allowProbe = true;

// Server stuff
const app = express();
const l = app.listen(port);
const startTime = new Date()

// Encryption
const crypto = new SimpleCrypto(encryptionkey)

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
        console.log("Start time is "+startTime)
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

app.get('/uptime', function(req, res){
  res.status(200).json({"Uptime":new Date()-startTime})
});

app.get('/entries', function(req, res){
  console.log(req.query)
  if(req.query.hasOwnProperty('auth')){
    res.status(200).json(loadWarehouse(req.query.auth).entries)
  }else{
    res.status(401).json({"error":"master password undefined"})
  }
})

app.get('/entry/:id', function(req, res){
  console.log(req.query)
  if(req.query.hasOwnProperty('auth')){
    var warehouse = loadWarehouse(req.query.auth)
    if(warehouse.entries.some(entry => entry.id === req.params.id)){
      for(var i in warehouse.entries){
        if(i.id==req.params.id){
          res.status(200).json(i)
          return
        }
      }
      res.status(500).json({"error":"entry exists but could not be located"})
    }else{
      res.status(404).json({"error":"entry with id not found"})
    }
    res.status(200).json()
  }else{
    res.status(401).json({"error":"master password undefined"})
  }
})

app.get('/create', function(req, res){
  console.log(req.query)
  if(req.query.hasOwnProperty('auth')){
    if(req.query.hasOwnProperty('name') && req.query.hasOwnProperty('url') && req.query.hasOwnProperty('value')){
      res.status(200).json({"Test":"Test"})
    }else{
      res.status(500).json({"error":"missing value(s)"})
    }
    //res.status(200).json(loadWarehouse(req.query.auth).entries)
  }else{
    res.status(401).json({"error":"master password undefined"})
  }
})

/**
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
*/