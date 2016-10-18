// REQUIRING
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var fs = require("fs");

// ROUTING
app.get("/js", express.static(__dirname+"/js"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/html/index.html");
});

app.get("/:room", function(req, res) {
  var room = req.params['room'];
  if (room in rooms) {
    fs.readFile(__dirname + "/html/video.html", 'utf8', function(err, data) {
      data = data.replace("%ROOM%", room);
      data = data.replace("%ROOM%", room);
      res.writeHead(200);
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("404: Not a valid room!");
  }
});

// MODEL
var rooms = {};
var sockets = [];

var newRoomData = function() {
  return {
    'videoChosen': false,
    'videoURL': "",
    'videoTime': 0,
    'videoIsPlaying': false
  };
};

// SOCKET.IO ROUTING
io.on("connection", function(socket) {
  socket.on("createRoom", function(name) {
    if (name in rooms) {
      socket.emit("createRoomFeedback", "Room name already exists!");
    } else {
      rooms[name] = newRoomData();
      socket.emit("createRoomFeedback", "Room " + name + " successfully created.");
    }
  });
  socket.on("joinRoom", function(name) {
    if (name in rooms) {
      socket.emit("joinRoomFeedback", name, "Joined room " + name + " successfully.");
    } else {
      socket.emit("joinRoomFeedback", "", "Room name does not exist!");
    }
  });
  socket.on("firstRun", function(room) {
    if (room in rooms) {
      socket.join(room);
      var roomData = rooms[room];
      if (roomData.videoChosen) {
        socket.emit("videoChosen", roomData.videoURL, roomData.videoTime);
      }
    }
  });
  socket.on("videoUrl", function(room, url) {
    if (room in rooms) {
      rooms[room]['videoChosen'] = true;
      rooms[room]['videoURL'] = url;
      var roomData = rooms[room];
      io.to(room).emit("videoChosen", url, roomData.videoTime);
    }
  });
  socket.on("clientPlay", function(room, time) {
    if (room in rooms) {
      rooms[room]['videoTime'] = time;
      if (!rooms[room]['videoIsPlaying']) {
        io.to(room).emit("serverPlay", time);
      }
      rooms[room]['videoIsPlaying'] = true;
    }
  });
  socket.on("clientPause", function(room, time) {
    if (room in rooms) {
      rooms[room]['videoTime'] = time;
      if (rooms[room]['videoIsPlaying']) {
        io.to(room).emit("serverPause", time);
      }
      rooms[room]['videoIsPlaying'] = false;
    }
  });
});

// PORT LISTENING
var port = process.env.PORT || 3000;
http.listen(port, function() {
  console.log("Listening at port 3000...");
});
