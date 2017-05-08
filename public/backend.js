
      /************************************* Setting Up editor ***********************************************************/
      var editor = ace.edit("center");
      editor.setTheme("ace/theme/cobalt");
      editor.getSession().setMode("ace/mode/python");
      /************************************** Socket Setup ***************************************************************/
      var socket = io();
      socket.on('reply', function(data){
      document.getElementById("snippet").innerHTML += data.response + '<br>';
      });
      socket.on('opened', function(data){
      editor.setValue(data.file, -1)
      editor.navigateFileEnd()
      });
      socket.on('executionresults', function(data){
      document.getElementById("terminal").innerHTML += data.response + '<br>';
      });
      socket.on('welcome', function(data){
      document.getElementById("snippet").innerHTML += data.message + '<br>';
      });
      socket.on('downloadableFile', function(data){
      var elem = document.createElement('a');
      elem.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data.content));
      elem.setAttribute('download', data.name+ ".py");
      elem.style.display = 'none';
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(element);
      });
      /**************************************** Running Code on the Client Side ******************************************/
      // output functions are configurable.  This one just appends some text
      // to a pre element.
      function outf(text) {
      var mypre = document.getElementById("output");
      mypre.innerHTML = mypre.innerHTML + text;
      }
      function builtinRead(x) {
      if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
      throw "File not found: '" + x + "'";
      return Sk.builtinFiles["files"][x];
      }
      // Here's everything you need to run a python program in skulpt
      // grab the code from your textarea
      // get a reference to your pre element for output
      // configure the output function
      // call Sk.importMainWithBody()
      function runit(code) {
      var prog = code;
      var mypre = document.getElementById("output");
      mypre.innerHTML = '';
      Sk.pre = "output";
      Sk.configure({output:outf, read:builtinRead});
      (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'mycanvas';
      var myPromise = Sk.misceval.asyncToPromise(function() {
      return Sk.importMainWithBody("<stdin>", false, prog, true);
      });
      myPromise.then(function(mod) {
      console.log('success');
      },
      function(err) {
      console.log(err.toString());
      });
      }
      /****************************************  Compiler ****************************************************************/
      var listening = false
      var compiler = function(data, editor){
      var messages = data.split(" ");
      for (i = 0; i < messages.length; i++){
      if ((messages[i] == 'buggy') && ((i + 2) < messages.length)){
      if ((messages[i+1] == "start") && (messages[i+2] == 'listening')){
      listening = true;
      break;
      }
      else if ((messages[i+1] == "stop") && (messages[i+2] == 'listening')){
      listening = false;
      break;
      }
      else if (messages[i+1] == "search") {
      var query = "";
      for (j = i + 1; j < messages.length; j++){
      query += messages[j] + ' ';
      }
      document.getElementById("snippet").innerHTML+=query + '<br>';
      socket.emit('search', {message: query});
      break;
      }
      else if ((messages[i+1] == "please") && (messages[i+2] == "run")) {
      var text = editor.getValue();
      document.getElementById("terminal").innerHTML += "Executing code:" + '<br>';
      runit(text)
      break;
      }
      else if ((((messages[i+1] == "save") && (messages[i+2] == 'file')) && (messages[i+3] == 'as')) && (messages.length >= 5)) {
      var fileContent = editor.getValue();
      var filename = messages[i+4]
      var user = "luffy"
      socket.emit('saveFile', {content: fileContent, username: user, name: filename});
      break;
      }
      else if ((((messages[i+1] == "delete") && (messages[i+2] == 'file')) && (messages[i+3] == 'named')) && (messages.length >= 5)) {
      var filename = messages[i+4]
      var user = "luffy"
      socket.emit('deleteFile', {username: user, name: filename});
      break;
      }
      else if ((((messages[i+1] == "download") && (messages[i+2] == 'file')) && (messages[i+3] == 'named')) && (messages.length >= 5)) {
      var filename = messages[i+4]
      var user = "luffy"
      socket.emit('download', {username: user, name: filename});
      break;
      }
      else if ((((messages[i+1] == "open") && (messages[i+2] == 'file')) && (messages[i+3] == 'named')) && (messages.length >= 5)) {
      var filename = messages[i+4]
      var user = "luffy"
      socket.emit('open', {username: user, name: filename});
      break;
      }
      }
      if (listening){
      if (messages[i] == "quote"){
      editor.insert("\\"");
      }
      else if (messages[i] == "Focus") {
      editor.focus();
      }
      else if (messages[i] == "star") {
      editor.insert("*");
      }
      else if (messages[i] == "pound") {
      editor.insert("#");
      }
      else if (messages[i] == "comma") {
      editor.insert(",");
      }
      else if ((messages[i] == "new") || (messages[i] == "\\n")) {
      editor.insert("\\n");
      }
      else if (messages[i] == "space"){
      editor.insert(" ");
      }
      else if (messages[i] == "delete"){
      editor.removeWordLeft();
      }
      else if (messages[i] == "clear") {
      editor.removeToLineStart();
      }
      else if (messages[i] == "reset") {
      editor.selectAll();
      editor.removeLines();
      }
      else if ( (messages[i] == "move") || (messages[i] == "go") ) {
      if ((messages[i+1] == "upwards") || (messages[i+1] == "up")) {
      editor.navigateUp(1);
      i++;
      }
      else if ((messages[i+1] == "downwards") || (messages[i+1] == "down")){
      editor.navigateDown(1);
      i++;
      }
      else if (messages[i+1] == "left") {
      editor.navigateWordLeft();
      i++;
      }
      else if (messages[i+1] == "right") {
      editor.navigateWordRight();
      i++;
      }
      else if (messages[i+1] == "to") {
      if (messages[i+2] == "start") {
      editor.navigateFileStart();
      i++;
      }
      else if (messages[i+2] == "end") {
      editor.navigateFileEnd();
      i++;
      }
      else if (messages[i+2] == "front") {
      editor.navigateLineStart();
      i++;
      }
      else if (messages[i+2] == "back") {
      editor.navigateLineEnd();
      i++;
      }
      else {
      editor.insert("move to ");
      }
      i++;
      }
      else {
      editor.insert(messages[i]+" ");
      }
      }
      else if (messages[i] == "left") {
      if (messages[i+1] == "curly") {
      editor.insert("{");
      i++;
      }
      else if (messages[i+1] == "paren") {
      editor.insert("(");
      i++;
      }
      else if (messages[i+1] == "bracket") {
      editor.insert("[");
      i++;
      }
      else {
      editor.insert(messages[i]+' ');
      }
      }
      else if (messages[i] == "right") {
      if (messages[i+1] == "curly") {
      editor.insert("}");
      i++;
      }
      else if (messages[i+1] == "paren") {
      editor.insert(")");
      i++;
      }
      else if (messages[i+1] == "bracket") {
      editor.insert("]");
      i++;
      }
      else {
      editor.insert(messages[i]+' ');
      }
      }
      else{
      editor.insert(messages[i]+' ');
      }
      }
      }
      }
      /************************************** HTML 5 Speech Recognition system *********************************/
      if (!('webkitSpeechRecognition' in window)) {
      upgrade();
      } else {
      var recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onerror = function(event) { console.log("oops") }
      recognition.onend = function() { recognition.start() }
      recognition.onresult = function(event) {
      compiler(event.results[0][0].transcript, editor);
      };
      }
      console.log("Hello World")
      recognition.start()