/******************************** Importing necessary modules ****************************/
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var mongodb = require('mongodb');
var session = require('express-session');
var python = require('python-runner'); 
//var cookie_parser = require('cookie-parser');
var request = require('request');
var cheerio = require('cheerio');
var google = require('google');
google.resultsPerPage = 1

/******************************** Setup ************************************************/

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = mongodb.MongoClient;
app.use(bodyParser.urlencoded({extended: true}))
app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 8081);
app.set('views', './views')
app.set('view engine', 'pug')
var db_url = "mongodb://ryanaw:c0d1ng!2@ds119091.mlab.com:19091/heroku_5w43r3p2";

/******************************** Page Routing ******************************************/

// Route to main page
app.get('/', function(req, res){
   if (checkLoginStatus(req)){
    res.render('workspace', {username: req.session.user})
  }
  else {
    res.sendFile(__dirname + '/main.html');
  }
})

// Socket connection setup to aid in communication between server and clients.
io.on('connection', function(socket){
  socket.emit('welcome', {message: "Welcome to Buggy"})

  /******** FILE RENDER Function ******************************************************/

socket.on('getFiles', function(data){
  var email = data.username;
    // Connect to the Server
  if ((typeof(email) != 'string'))
  {
    console.log('Not a valid input');
  }
  else
  {
    MongoClient.connect(db_url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Database connection established');
    }

      var userDB = db.collection('users')
      //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
      userDB.find({'email' : email}).toArray(function(err, result) {
        if (err) {
            console.log(err);
        } else if (result.length) {
          var dictionary = result[0]["files"];
              var files = []
              for (var key in dictionary) {
                console.log(key);
                socket.emit('files', {filename: key});
              }

        } else {
              console.log("Everything else failed.")
          }
        })
    });
  } 
});

/**************************************************************************************/

  socket.on('disconnect', function () {
  });

  socket.on('open', function (data) {
    var email = data.username;
    var filename = data.name;
  if ((typeof(email) != 'string') || (typeof(filename) != 'string'))
  {
    console.log('Not a valid input');
  }
  else
  {

    MongoClient.connect(db_url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Database connection established');
      }

        var userDB = db.collection('users')
        //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
        userDB.find({'email' : email}).toArray(function(err, result) {
          if (err) {
              console.log(err);
          } else if (result.length) {
            console.log("Found account" + email)
            var dictionary = result[0]["files"];
            var content = dictionary[filename]
            socket.emit('opened', {file: content})
          } else {
                console.log("no files available of that name")
                return 0
            }
          })
      });
  }
  });

  socket.on('search', function(data){
    let query = data.message
    let language = "python"
    let reply = ""

    newsearch(query, language).then((url) => {
      return download(url)
    }).then((html) => {
        //console.log(html)
        let answer = scrape(html)
        if (answer === '') {
        reply += 'No answer found :( \n'
      } else {
        reply += 'Found snippet! \n'
        reply += answer + '\n'
        newreply = reply.replace('\n', '<br>');
      }
      socket.emit('reply', {response: newreply})
    }).catch((error) => {
      console.log(error.reason)
    })
  })

  socket.on('download', function(data){
    var email = data.username;
    var filename = data.name;
    if ((typeof(email) != 'string') || (typeof(filename) != 'string'))
  {
    console.log('Not a valid input');
  }
  else {
    MongoClient.connect(db_url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Database connection established');
      }

        var userDB = db.collection('users')
        //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
        userDB.find({'email' : email}).toArray(function(err, result) {
          if (err) {
              console.log(err);
          } else if (result.length) {
            console.log("Found account" + email)
            var dictionary = result[0]["files"];
            var contents = dictionary[filename];
            socket.emit("downloadableFile", {name: filename, content: contents});
          } else {
                console.log("no files available of that name")
                return 0
            }
          })
      });
  }
  })

  /************** function that DELETES a file from a users account ***************/
function deleteFile(email, filename, callbackSucc) {
  if ((typeof(email) != 'string') || (typeof(filename) != 'string'))
  {
    console.log('Not a valid input');
  }
  else
  {
    // Connect to the Server
    MongoClient.connect(db_url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Database connection established');
      }

        var userDB = db.collection('users')
        //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
        userDB.find({'email' : email}).toArray(function(err, result) {
          if (err) {
              console.log(err);
          } else if (result.length) {
            console.log("Found account" + email)
              callbackSucc(result[0]["files"], filename, userDB, email)
          } else {
                console.log("no files available of that name")
                return 0
            }
          })
      });
  }
  return 0;
}

/*********************** SAVE FUNCTIONS HERE *****************************************/
function saveFile(email, filename, contentString, callbackSucc) {
  if ((typeof(email) != 'string') || (typeof(filename) != 'string') || (typeof(contentString) != 'string'))
  {
    console.log('Not a valid input');
  }
  else
  {
    // Connect to the Server
    MongoClient.connect(db_url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Database connection established');
      }

        var userDB = db.collection('users')
        //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
        userDB.find({'email' : email}).toArray(function(err, result) {
          if (err) {
              console.log(err);
          } else if (result.length) {
            console.log("Found account" + email)
              callbackSucc(result[0]["files"], filename, contentString, userDB, email)
          } else {
                console.log("no files available of that name")
                return 0
            }
          })
      });
  }
    return 0;
}

/********** send to downloads link (HTML5 solution) *****************/
function savetoDatabase(fileDict, filename, contentString, userDB, email) {
  var dictionary = fileDict;
  dictionary[filename] = contentString;

  userDB.update(
    {'email' : email},
    {'$set' : 
      {
        'files' : dictionary
      }
    }
  )
  socket.emit('update', {file:filename});
}

/**************** call back function for deleting file **************/
function removeFile(fileDict, filename, userDB, email) {
  var dictionary = fileDict;
  delete dictionary[filename]
  userDB.update(
    {'email' : email},
    {'$set' : 
      {
        'files' : dictionary
      }
    }
  )
}

  socket.on('saveFile', function(data){
    saveFile(data.username, data.name, data.content, savetoDatabase);
  })

  socket.on('deleteFile', function(data){
    console.log(data.username)
    console.log(data.name)
    deleteFile(data.username, data.name, removeFile)
  })

});

// Post method to deal with logins.
app.post('/newlog', function(req, res){
  var email = req.body.email
  var password = req.body.password
  loginAccount(email, password, redirectHome, redirectEmailCollision, req, res)
})

// Post method to deal with sign ups.
app.post('/createAccount', function(req, res){
  var email = req.body.email
  var password = req.body.password
  var passwordConf = req.body.passwordConf
  createAccount(email, password, passwordConf, redirectHome, redirectEmailCollision, req, res)
})

app.post('/userInput', function(req, res){
  console.log(res);
  res.end();
})

// Route to Sign up page.
app.get('/new_account', function(req, res){
  res.sendFile(__dirname + '/create_account.html')
})

app.get('/about', function(req, res) {
  res.sendFile(__dirname + '/about.html')
})

app.get('/tutorial', function(req, res) {
  res.sendFile(__dirname + '/tutorial.html')
})

app.get('/dd', function(req, res){
  res.sendFile(__dirname + '/skult.html')
})

// Logout Button.
app.get('/!', function(req, res, next) {
  delete req.session.user
  res.redirect("/")
});

app.get('/:username', function(req, res) {
  if (checkLoginStatus(req)){
    res.sendFile(__dirname + '/Aindex.html');
  }
  else {
    res.redirect('/')
  }
})


/*********************** Helper functions used in code snippets *****************************/
function newsearch(query, language) {
  return new Promise((resolve, reject) => {
    let searchString = `${query} in ${language} site:stackoverflow.com`

    google(searchString, (err, res) => {
      if (err) {
        reject({
          reason: 'A search error has occured :('
        })
      } else if (res.links.length === 0) {
        reject({
          reason: 'No results found :('
        })
      } else {
        resolve(res.links[0].href)
      }
    })
  })
}

function scrape(html) {
  $ = cheerio.load(html)
  return $('div.accepted-answer pre code').text()
}

function download(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(body)
      } else {
        console.log(error)
        reject({
          reason: 'Unable to download page'
        })
      }
    })
  })
}

/********************* Helper functions used in Account creations and Logins *****************/

function createAccount(email, password, passwordConf, callbackSucc, callbackFail, req, res) {

  var salt = bcrypt. genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);

  if ((password != passwordConf) || (email == "") || (password == "")) {
    callbackFail(res)
  }
  else if ((typeof(email) != 'string') || (typeof(password) != 'string') || (typeof(passwordConf) != 'string'))
  {
    console.log('Not a valid input');
    callbackFail(res);
  }
  else
  {
      // Connect to the Server
  MongoClient.connect(db_url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Database connection established');
    }

      var userDB = db.collection('users')
      //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
      userDB.find({'email' : email}).toArray(function(err, result) {
        if (err) {
            console.log(err);
        } else if (result.length > 0) {
            callbackFail(res)
        } else {
              var userJSON = {"email": email, "password": hash, "files": {}}
            userDB.insert(userJSON, function(err, result) {
            if (err) {
                console.log(err);
                } else {
                  console.log(email + " was added!")
                  callbackSucc(req, res, email)
                }
            })
          }
        })
    });
  }
}

function loginAccount(email, password, callbackSucc, callbackFail, req, res) {
  console.log('hi')

  // Connect to the Server
  MongoClient.connect(db_url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Database connection established');
    }

      var userDB = db.collection('users')
      userDB.find({'email' : email}).toArray(function(err, result) {
        if (err) {
            console.log(err);
        } 
        else if (result.length){
            if (bcrypt.compareSync(password, result[0]["password"]) != true) {
              console.log("uh oh")
              console.log(result[0]["password"])
              callbackFail(res)
            }
            else {
              callbackSucc(req, res, email)
            }
            
        } else {
            callbackFail(res)
          }
      })
    });
}

function redirectHome(req, res, email) {
  if (email.length == 0) {
    res.send("error") 
  }
  else {
    req.session.user = email
    res.redirect("/")
  }
}

function redirectEmailCollision(res) {
  res.redirect("/new_account")
}

function checkLoginStatus(req) {
  if (req.session.user == undefined) return false
  if (req.session.user.length == 0) return false
  else return true
}

/************************************** Starting the server **************************************/

  // Set up express server
var server = http.listen(app.get('port'), function(){
  console.log('Server running at http://127.0.0.1:' + app.get('port'));
});

